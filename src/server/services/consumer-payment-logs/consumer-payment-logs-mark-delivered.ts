import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import { env } from "@/env"
import type { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"

const notifyBuyerOfDelivery = async ({ email, message }: { email: string; message: string }) => {
  try {
    await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/shop-order-delivered`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    })
  } catch (error) {
    console.error("Failed to send shop order delivered email:", error)
  }
}

export const consumerPaymentLogsMarkDelivered = async ({
  database,
  input,
}: {
  database: typeof db
  input: { consumerPaymentLogId: string; digitalSalesId: string; actingUserId: string; message: string }
}) => {
  const scopedToOrder = and(
    eq(consumerPaymentLogs.id, input.consumerPaymentLogId),
    eq(consumerPaymentLogs.digitalSalesId, input.digitalSalesId)
  )

  const existing = await database.query.consumerPaymentLogs.findFirst({
    columns: { orderStatus: true, paymentMethod: true, barsQuantity: true },
    with: { consumer: { columns: { email: true } } },
    where: scopedToOrder,
  })

  if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." })

  if (existing.orderStatus === OrderStatusEnum.DELIVERED) {
    throw new TRPCError({ code: "CONFLICT", message: "This order is already marked as delivered." })
  }

  const isCashOrder = existing.paymentMethod === PaymentMethodEnum.CASH

  const [updated] = await database
    .update(consumerPaymentLogs)
    .set({
      orderStatus: OrderStatusEnum.DELIVERED,
      deliveredAt: new Date(),
      ...(isCashOrder ? { paymentStatus: PaymentStatusEnum.PAID } : {}),
      updatedByUserId: input.actingUserId,
    })
    .where(and(scopedToOrder, eq(consumerPaymentLogs.orderStatus, OrderStatusEnum.NOT_DELIVERED)))
    .returning()

  if (!updated) {
    throw new TRPCError({ code: "CONFLICT", message: "This order is already marked as delivered." })
  }

  if (existing.consumer?.email) {
    await notifyBuyerOfDelivery({ email: existing.consumer.email, message: input.message })
  }

  return updated
}
