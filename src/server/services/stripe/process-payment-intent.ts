import type Stripe from "stripe"

import { type ConsumerOrderDetails, PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import { PaymentLogsStatusEnum, PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { ShopOrdersPaymentTypeEnum } from "@/constants/shop-orders"
import { env } from "@/env"
import { type SupabasePaymentLog, createServiceClient } from "@/lib/supabase/service-client"

/**
 * Single source of truth for writing payment_logs, and for shop card orders, updating
 * consumer_payment_logs, bumping inventory, and sending the confirmation/failure emails.
 *
 * Called from two places, both are legitimate triggers for the same result:
 *   1. The Stripe webhook (`webhook/route.ts`) — the primary, async path.
 *   2. The `confirm` endpoint (`card-order/[orderId]/confirm/route.ts`) — a
 *      client-triggered fallback for when the customer's browser independently
 *      confirms success (via polling) before the webhook has had a chance to land.
 *
 * Safe to call more than once for the same PaymentIntent from either trigger —
 * every write here is guarded so a second call is a no-op, not a double-apply.
 */
export const processPaymentIntentResult = async (
  paymentIntent: Stripe.PaymentIntent,
  status: PaymentLogsStatusEnum
) => {
  const supabaseServiceClient = createServiceClient()
  const { organizationId, userId, campaignId, consumerId, consumerPaymentLogId } = paymentIntent.metadata

  const { data: paymentLog } = (await supabaseServiceClient
    .from("payment_logs")
    .select("*")
    .eq("transaction_id", paymentIntent.id)
    .single()) as { data: SupabasePaymentLog }

  const transactionId = paymentIntent.id
  const feeCents = paymentIntent.application_fee_amount
  const amountCents = paymentIntent.amount - (feeCents ?? 0)

  if (paymentLog?.id) {
    await supabaseServiceClient.from("payment_logs").update({ status }).eq("id", paymentLog.id)
  } else {
    await supabaseServiceClient.from("payment_logs").insert({
      transaction_id: paymentIntent.id,
      amount_cents: amountCents,
      fee_cents: feeCents,
      organization_id: organizationId,
      user_id: userId,
      campaign_id: campaignId,
      consumer_id: consumerId ?? null,
      type: PaymentLogsTypeEnum.DIGITAL,
      created_by_user_id: userId,
      status,
    })
  }

  // Everything below is shop card orders only
  if (!consumerPaymentLogId) return

  const { data: existingConsumerLog } = await supabaseServiceClient
    .from("consumer_payment_logs")
    .select("payment_status, order_details, digital_sales_id, consumer_id, bars_quantity, amount_cents")
    .eq("id", consumerPaymentLogId)
    .single()

  const currentPaymentStatus = existingConsumerLog?.payment_status
  const isTerminal =
    currentPaymentStatus === PaymentStatusEnum.PAID || currentPaymentStatus === PaymentStatusEnum.FAILED

  const consumerPaymentStatus = isTerminal
    ? undefined // already PAID or FAILED — never move a terminal order backward or sideways
    : status === PaymentLogsStatusEnum.COMPLETED
      ? PaymentStatusEnum.PAID
      : status === PaymentLogsStatusEnum.FAILED
        ? PaymentStatusEnum.FAILED
        : undefined // still processing — nothing to change yet

  const justPaid = consumerPaymentStatus === PaymentStatusEnum.PAID
  const justFailed = consumerPaymentStatus === PaymentStatusEnum.FAILED
  const orderDetailsForFailureCheck = existingConsumerLog?.order_details as ConsumerOrderDetails | undefined

  await supabaseServiceClient
    .from("consumer_payment_logs")
    .update({
      card_transaction_id: transactionId,
      ...(consumerPaymentStatus ? { payment_status: consumerPaymentStatus } : {}),
      ...(justPaid ? { amount_cents: amountCents } : {}),
    })
    .eq("id", consumerPaymentLogId)

  // Failure email
  if (justFailed && existingConsumerLog && orderDetailsForFailureCheck?.pollingTimedOutAt) {
    const { data: consumerRow } = await supabaseServiceClient
      .from("consumers")
      .select("email")
      .eq("id", existingConsumerLog.consumer_id)
      .single()

    const orderDetails = existingConsumerLog.order_details as ConsumerOrderDetails

    if (consumerRow?.email) {
      try {
        await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/shop-order-failed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salesPageId: existingConsumerLog.digital_sales_id,
            email: consumerRow.email,
            buyerName: orderDetails.name,
            itemName: orderDetails.packageLabel,
            barsQuantity: existingConsumerLog.bars_quantity,
            amountCents: existingConsumerLog.amount_cents,
          }),
        })
      } catch (error) {
        console.error("Failed to send shop order failed email:", error)
      }
    }
  }

  // Everything below here is success-only.
  if (!justPaid || !existingConsumerLog) return

  const { data: salesInfo } = await supabaseServiceClient
    .from("digital_sales_information")
    .select("digital_sales_details")
    .eq("id", existingConsumerLog.digital_sales_id)
    .single()

  const currentInventory = salesInfo?.digital_sales_details?.inventory_details

  if (currentInventory) {
    await supabaseServiceClient
      .from("digital_sales_information")
      .update({
        digital_sales_details: {
          ...salesInfo.digital_sales_details,
          inventory_details: {
            ...currentInventory,
            sold_online: (currentInventory.sold_online ?? 0) + existingConsumerLog.bars_quantity,
            updated_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", existingConsumerLog.digital_sales_id)
  }

  const { data: consumerRow } = await supabaseServiceClient
    .from("consumers")
    .select("email")
    .eq("id", existingConsumerLog.consumer_id)
    .single()

  const orderDetails = existingConsumerLog.order_details as ConsumerOrderDetails

  if (consumerRow?.email) {
    try {
      await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/shop-order-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesPageId: existingConsumerLog.digital_sales_id,
          packageKey: orderDetails.packageKey,
          paymentType: ShopOrdersPaymentTypeEnum.CARD,
          email: consumerRow.email,
          buyerName: orderDetails.name,
          address: orderDetails.address,
          varietyPreferences: orderDetails.preferences,
        }),
      })
    } catch (error) {
      // Swallow — a downstream email failure shouldn't block the caller
      console.error("Failed to send shop order confirmation email:", error)
    }
    try {
      await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/shop-order-parent-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesPageId: existingConsumerLog.digital_sales_id,
          buyerName: orderDetails.name,
          phoneNumber: orderDetails.phoneNumber,
          buyerEmail: consumerRow.email,
          preferredContactMethodLabel: orderDetails.preferredContactMethod === "EMAIL" ? "Email" : "Phone",
          address: orderDetails.address,
          itemName: orderDetails.packageLabel,
          barsQuantity: existingConsumerLog.bars_quantity,
          paymentStatusLabel: "Paid",
          amountCents: existingConsumerLog.amount_cents,
          specialRequest: orderDetails.preferences,
        }),
      })
    } catch (error) {
      console.error("Failed to send shop order parent notification email:", error)
    }
  }
}
