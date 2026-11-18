import { and, eq, isNull } from "drizzle-orm"

import { CampaignTransactionEnum } from "@/constants/campaigns"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { casesTransactions, paymentLogs, users } from "@/server/db/schema"

export const campaignsGetTransactionsByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId: string }
}) => {
  const [user] = await database.select().from(users).where(eq(users.id, input.userId))
  if (!user) return []

  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.userId, input.userId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const casesTransactionsData = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT),
      eq(casesTransactions.userId, input.userId)
    ),
  })

  const allTransactions = [
    ...paymentLogsData.map(payment => ({
      createdAt: payment.createdAt,
      type: CampaignTransactionEnum.PAYMENT,
      amount: payment.amountCents ? payment.amountCents / 100 : 0,
      transactionType: payment.type,
      user,
    })),
    ...casesTransactionsData.map(transaction => ({
      createdAt: transaction.createdAt,
      type: CampaignTransactionEnum.CHECKOUT,
      amount: transaction.quantity,
      transactionType: transaction.type,
      user,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return allTransactions
}
