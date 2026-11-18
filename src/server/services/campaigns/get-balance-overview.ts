import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { type CasesTransaction, type User, campaignsUsers, casesTransactions, paymentLogs } from "@/server/db/schema"

export type UserBalance = {
  userId: string
  casesCheckedOut: number
  casesPaid: number
  amountPaidCents: number
  amountDueCents: number
  casesTransactions: CasesTransaction[]
}

export interface CampaignBalanceOverview {
  usersById: Record<string, User>
  usersBalanceById: Record<string, UserBalance>
}

export const campaignsGetBalanceOverview = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<CampaignBalanceOverview> => {
  const campaignParticipants = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.campaignId, input.campaignId),
    with: {
      user: true,
    },
  })

  const campaignCasesTransactions = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
  })

  const campaignPaymentLogs = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const usersBalanceById: Record<string, UserBalance> = {}

  const usersById: Record<string, User> = campaignParticipants.reduce(
    (acc, participant) => {
      acc[participant.userId] = participant.user
      return acc
    },
    {} as Record<string, User>
  )

  for (const participant of campaignParticipants) {
    usersBalanceById[participant.userId] ??= {
      userId: participant.userId,
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      amountDueCents: 0,
      casesTransactions: [],
    }
  }

  for (const transaction of campaignCasesTransactions) {
    if (!transaction.userId) continue

    usersBalanceById[transaction.userId] ??= {
      userId: transaction.userId,
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      amountDueCents: 0,
      casesTransactions: [],
    }

    usersBalanceById[transaction.userId]!.casesCheckedOut += transaction.quantity

    usersBalanceById[transaction.userId]!.casesTransactions.push(transaction as CasesTransaction)

    usersBalanceById[transaction.userId]!.amountDueCents += transaction.totalPriceCents ?? 0
  }

  for (const payment of campaignPaymentLogs) {
    if (!payment.userId || !payment.amountCents) continue

    usersBalanceById[payment.userId] ??= {
      userId: payment.userId,
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      amountDueCents: 0,
      casesTransactions: [],
    }

    usersBalanceById[payment.userId]!.amountPaidCents += payment.amountCents
  }

  Object.values(usersBalanceById).forEach(userData => {
    if (userData.amountDueCents == 0 && userData.amountPaidCents > 0) return

    // Sort transactions by price (cheapest first) to simulate paying for cheaper cases first
    // This is one approach - you could implement a different payment allocation strategy
    userData.casesTransactions.sort((a, b) => (a.pricePerCaseCents ?? 0) - (b.pricePerCaseCents ?? 0))

    // Simulate payment allocation
    let remainingPaymentCents = userData.amountPaidCents
    let casesPaid = 0

    // Iterate through transactions from cheapest to most expensive
    for (const tx of userData.casesTransactions) {
      if (remainingPaymentCents <= 0) break

      if ((tx.pricePerCaseCents ?? 0) <= 0) continue // Skip free cases

      // Calculate how many cases can be paid with remaining amount
      const casesPayableFromTx = Math.min(tx.quantity, remainingPaymentCents / (tx.pricePerCaseCents ?? 0))

      // Add to total cases paid
      casesPaid += casesPayableFromTx

      // Reduce remaining payment
      remainingPaymentCents -= casesPayableFromTx * (tx.pricePerCaseCents ?? 0)
    }

    userData.casesPaid = casesPaid
  })

  return {
    usersById,
    usersBalanceById,
  }
}
