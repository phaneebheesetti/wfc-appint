import { and, eq } from "drizzle-orm"

import { PaymentMethodEnum, PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import type { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"

export interface OrderSummaryTotals {
  cardAmountCents: number
  cashAmountCents: number
  totalAmountCents: number
}

export const consumerPaymentLogsGetOrderSummaryByDigitalSalesId = async ({
  database,
  digitalSalesId,
}: {
  database: typeof db
  digitalSalesId: string
}): Promise<OrderSummaryTotals> => {
  const rows = await database.query.consumerPaymentLogs.findMany({
    where: and(
      eq(consumerPaymentLogs.digitalSalesId, digitalSalesId),
      eq(consumerPaymentLogs.paymentStatus, PaymentStatusEnum.PAID)
    ),
  })

  const totals = rows.reduce(
    (acc, row) => {
      if (row.paymentMethod === PaymentMethodEnum.CARD) {
        acc.cardAmountCents += row.amountCents
      } else if (row.paymentMethod === PaymentMethodEnum.CASH) {
        acc.cashAmountCents += row.amountCents
      }
      return acc
    },
    { cardAmountCents: 0, cashAmountCents: 0 }
  )

  return {
    ...totals,
    totalAmountCents: totals.cardAmountCents + totals.cashAmountCents,
  }
}
