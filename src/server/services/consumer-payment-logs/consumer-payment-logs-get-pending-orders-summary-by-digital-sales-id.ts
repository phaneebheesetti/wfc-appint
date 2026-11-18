import { and, count, desc, eq, inArray } from "drizzle-orm"

import {
  OrderStatusEnum,
  type PaymentMethodEnum,
  PaymentStatusEnum,
  normalizeBuyerName,
} from "@/constants/consumer-payment-logs"
import type { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"

export interface PendingOrderSummaryItem {
  id: string
  buyerName: string | null
  packageLabel: string
  barsQuantity: number
  amountCents: number
  paymentMethod: PaymentMethodEnum | null
  paymentStatus: PaymentStatusEnum | null
}

export interface PendingOrdersSummary {
  pendingCount: number
  latestOrders: PendingOrderSummaryItem[]
}

export const consumerPaymentLogsGetPendingOrdersSummaryByDigitalSalesId = async ({
  database,
  digitalSalesId,
}: {
  database: typeof db
  digitalSalesId: string
}): Promise<PendingOrdersSummary> => {
  const awaitingDelivery = and(
    eq(consumerPaymentLogs.digitalSalesId, digitalSalesId),
    eq(consumerPaymentLogs.orderStatus, OrderStatusEnum.NOT_DELIVERED),
    inArray(consumerPaymentLogs.paymentStatus, [PaymentStatusEnum.PENDING, PaymentStatusEnum.PAID])
  )

  const [pendingCountResult, latestOrders] = await Promise.all([
    database.select({ value: count() }).from(consumerPaymentLogs).where(awaitingDelivery),

    database.query.consumerPaymentLogs.findMany({
      where: awaitingDelivery,
      orderBy: [desc(consumerPaymentLogs.createdAt)],
      limit: 2,
    }),
  ])

  return {
    pendingCount: Number(pendingCountResult[0]?.value ?? 0),
    latestOrders: latestOrders.map(row => ({
      id: row.id,
      buyerName: normalizeBuyerName(row.orderDetails.name),
      packageLabel: row.orderDetails.packageLabel,
      barsQuantity: row.barsQuantity,
      amountCents: row.amountCents,
      paymentMethod: row.paymentMethod as PaymentMethodEnum | null,
      paymentStatus: row.paymentStatus as PaymentStatusEnum | null,
    })),
  }
}
