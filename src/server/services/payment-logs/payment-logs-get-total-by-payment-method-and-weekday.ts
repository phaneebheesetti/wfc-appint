import { and, eq, isNull } from "drizzle-orm"

import { PaymentLogsStatusEnum, PaymentLogsTypeEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { campaigns, paymentLogs } from "@/server/db/schema"

export const paymentLogsGetTotalByPaymentMethodAndWeekday = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const campaign = await database.query.campaigns.findFirst({
    where: eq(campaigns.id, input.campaignId),
    columns: {
      digitalPayment: true,
    },
  })

  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
    columns: {
      amountCents: true,
      type: true,
      createdAt: true,
    },
  })

  const totalsByWeekday = paymentLogsData.reduce(
    (acc: Record<number, { cash: number; digital: number }>, log) => {
      const weekday = log.createdAt.getDay() // 0 (Sun) to 6 (Sat)
      const method = log.type as PaymentLogsTypeEnum

      acc[weekday] ??= { cash: 0, digital: 0 }

      acc[weekday][method] += log.amountCents
      return acc
    },
    {} as Record<number, { cash: number; digital: number }>
  )

  const weekdayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const result = orderedDays.map(dayLabel => {
    const dayIndex = weekdayMap.indexOf(dayLabel)
    const totals = totalsByWeekday[dayIndex] ?? { cash: 0, digital: 0 }
    return { day: dayLabel, ...totals }
  })

  const totalCash = paymentLogsData
    .filter(log => (log.type as PaymentLogsTypeEnum) === PaymentLogsTypeEnum.CASH)
    .reduce((sum, log) => sum + log.amountCents, 0)

  const totalDigital = paymentLogsData
    .filter(log => (log.type as PaymentLogsTypeEnum) === PaymentLogsTypeEnum.DIGITAL)
    .reduce((sum, log) => sum + log.amountCents, 0)

  const totalAmount = totalCash + totalDigital

  const cashPercentage = totalAmount ? (totalCash / totalAmount) * 100 : 0
  const digitalPercentage = totalAmount ? (totalDigital / totalAmount) * 100 : 0

  return {
    weeklyTotals: result,
    paymentSummary: {
      cash: {
        percentage: Math.round(cashPercentage),
        amount: totalCash / 100,
        enabled: true,
      },
      digital: {
        percentage: Math.round(digitalPercentage),
        amount: totalDigital / 100,
        enabled: campaign?.digitalPayment,
      },
    },
  }
}
