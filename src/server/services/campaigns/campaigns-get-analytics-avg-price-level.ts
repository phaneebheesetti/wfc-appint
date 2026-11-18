import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { casesTransactions, paymentLogs } from "@/server/db/schema"

export const campaignsGetAnalyticsAvgPriceLevel = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const checkoutCases = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    with: {
      user: true,
    },
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })

  const campaignPaymentLogs = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const paymentLogsByUser = campaignPaymentLogs.reduce(
    (acc, curr) => {
      if (curr.userId) {
        acc[curr.userId] ??= {
          amountPaidCents: 0,
        }

        if (curr.amountCents) {
          acc[curr.userId]!.amountPaidCents += curr.amountCents
        }
      }
      return acc
    },
    {} as Record<string, { amountPaidCents: number }>
  )

  const usersBalance = checkoutCases.reduce(
    (acc, curr) => {
      const user = curr.user
      if (!user?.id) return acc
      acc[user.id] ??= {
        casesCheckedOut: 0,
        amountDueCents: 0,
      }
      acc[user.id]!.casesCheckedOut += curr.quantity
      acc[user.id]!.amountDueCents += (curr.pricePerCaseCents ?? 0) * curr.quantity
      return acc
    },
    {} as Record<string, { casesCheckedOut: number; amountDueCents: number }>
  )

  const userCasesPaid = Object.keys(usersBalance).map(userId => {
    const userCase = usersBalance[userId]!
    const paymentLog = paymentLogsByUser[userId]
    const amountPaidCents = paymentLog?.amountPaidCents ?? 0

    const avgPricePerCase = userCase.amountDueCents > 0 ? userCase.amountDueCents / userCase.casesCheckedOut : 0

    const casesPaid = avgPricePerCase > 0 ? amountPaidCents / avgPricePerCase : 0

    return {
      userId,
      ...userCase,
      amountPaidCents,
      avgPricePerCase,
      casesPaid,
    }
  })

  const totalCasesPaid = userCasesPaid.reduce((sum, u) => sum + u.casesPaid, 0)
  const totalUsersWithPayment = userCasesPaid.filter(u => u.amountPaidCents > 0).length
  const avgCasesPaidPerUser = totalUsersWithPayment > 0 ? totalCasesPaid / totalUsersWithPayment : 0

  return {
    userCasesPaid,
    totalCasesPaid,
    avgCasesPaidPerUser,
  }
}
