import { and, desc, eq, inArray, or } from "drizzle-orm"

import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  type PreferredContactMethodEnum,
  normalizeBuyerName,
} from "@/constants/consumer-payment-logs"
import type { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"

export interface OrderSummaryListItem {
  id: string
  buyerName: string | null
  placedAt: Date
  packageLabel: string
  barsQuantity: number
  amountCents: number
  paymentMethod: PaymentMethodEnum | null
  paymentStatus: PaymentStatusEnum | null
  paidAt: Date | null
  orderStatus: OrderStatusEnum
  deliveredAt: Date | null
  email: string
  phoneNumber: string
  address: string | null
  preferences: string | null
  preferredContactMethod: PreferredContactMethodEnum
}

export const consumerPaymentLogsGetOrdersByDigitalSalesId = async ({
  database,
  digitalSalesId,
}: {
  database: typeof db
  digitalSalesId: string
}): Promise<OrderSummaryListItem[]> => {
  const rows = await database.query.consumerPaymentLogs.findMany({
    where: and(
      eq(consumerPaymentLogs.digitalSalesId, digitalSalesId),
      or(
        inArray(consumerPaymentLogs.paymentStatus, [PaymentStatusEnum.PENDING, PaymentStatusEnum.PAID]),
        eq(consumerPaymentLogs.orderStatus, OrderStatusEnum.REQUESTED)
      )
    ),
    with: {
      consumer: { columns: { email: true } },
      paymentLog: { columns: { createdAt: true } },
    },
    orderBy: [desc(consumerPaymentLogs.createdAt)],
  })

  return rows.map(row => {
    const paidAt = resolvePaidAt({
      paymentMethod: row.paymentMethod as PaymentMethodEnum | null,
      paymentStatus: row.paymentStatus as PaymentStatusEnum | null,
      deliveredAt: row.deliveredAt,
      cardPaidAt: row.paymentLog?.createdAt,
    })

    return {
      id: row.id,
      buyerName: normalizeBuyerName(row.orderDetails.name),
      placedAt: row.createdAt,
      packageLabel: row.orderDetails.packageLabel,
      barsQuantity: row.barsQuantity,
      amountCents: row.amountCents,
      paymentMethod: row.paymentMethod as PaymentMethodEnum | null,
      paymentStatus: row.paymentStatus as PaymentStatusEnum | null,
      paidAt,
      orderStatus: row.orderStatus as OrderStatusEnum,
      deliveredAt: row.deliveredAt,
      address: row.orderDetails.address,
      email: row.consumer?.email,
      phoneNumber: row.orderDetails.phoneNumber,
      preferences: row.orderDetails.preferences,
      preferredContactMethod: row.orderDetails.preferredContactMethod,
    }
  })
}

const resolvePaidAt = ({
  paymentMethod,
  paymentStatus,
  deliveredAt,
  cardPaidAt,
}: {
  paymentMethod: PaymentMethodEnum | null
  paymentStatus: PaymentStatusEnum | null
  deliveredAt?: Date | null
  cardPaidAt?: Date | null
}): Date | null => {
  if (paymentStatus !== PaymentStatusEnum.PAID) return null

  if (paymentMethod === PaymentMethodEnum.CASH) return deliveredAt ?? null

  return cardPaidAt ?? null
}
