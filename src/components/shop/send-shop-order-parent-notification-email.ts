import * as Sentry from "@sentry/nextjs"

interface SendShopOrderParentNotificationEmailProps {
  salesPageId: string
  buyerName: string | undefined
  phoneNumber: string
  buyerEmail: string
  preferredContactMethodLabel: string
  address: string | undefined
  itemName: string
  barsQuantity: number
  paymentStatusLabel: string
  amountCents: number
  specialRequest: string | undefined
}

export const sendShopOrderParentNotificationEmail = async (payload: SendShopOrderParentNotificationEmailProps) => {
  try {
    const response = await fetch("/api/email/send/shop-order-parent-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Parent notification email failed with status ${response.status}`)
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { email_type: "shop-order-parent-notification" },
      extra: { salesPageId: payload.salesPageId },
    })
  }
}
