import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { env } from "@/env"
import type { db } from "@/server/db"
import { casesTransactions, paymentLogs } from "@/server/db/schema"
import { campaignsUsersListChocolateRequestAlerts } from "@/server/services/campaigns-users"

export const campaignsGetSmallCardsMetrics = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const paymentLogsResult = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const casesTransactionsResult = await database.query.casesTransactions.findMany({
    where: eq(casesTransactions.campaignId, input.campaignId),
  })

  const casesDelivered = casesTransactionsResult.filter(
    transaction => transaction.type === (CasesTransactionsTypeEnum.DELIVERED as string)
  )

  const casesCheckedOut = casesTransactionsResult.filter(
    transaction => transaction.type === (CasesTransactionsTypeEnum.CHECKOUT as string)
  )

  // Inventory adjustments are only counted when the feature flag is on
  const casesAdjusted =
    env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
      ? casesTransactionsResult.filter(
          transaction => transaction.type === (CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT as string)
        )
      : []

  const totalCasesDelivered = casesDelivered.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalCasesCheckedOut = casesTransactionsResult
    .filter(transaction => transaction.type === (CasesTransactionsTypeEnum.CHECKOUT as string))
    .reduce((acc, curr) => acc + curr.quantity, 0)

  const totalCasesAdjusted = casesAdjusted.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalCasesAvailable = Math.max(totalCasesDelivered - totalCasesAdjusted - totalCasesCheckedOut, 0)

  const chocolateRequestAlerts = await campaignsUsersListChocolateRequestAlerts({ database, input })
  const totalCasesCheckoutRequests = chocolateRequestAlerts.length

  const totalPotentialRevenue = casesDelivered.reduce((acc, curr) => {
    return acc + (curr?.totalPriceCents ?? 0)
  }, 0)

  const totalOwed = casesCheckedOut.reduce((acc, curr) => {
    return acc + (curr?.totalPriceCents ?? 0)
  }, 0)

  const totalPaymentCollected = paymentLogsResult.reduce((acc, curr) => acc + (curr?.amountCents ?? 0), 0)
  let totalMoneyDue = totalOwed - totalPaymentCollected
  totalMoneyDue = totalMoneyDue > 0 ? totalMoneyDue / 100 : 0
  const totalAdjustedRevenue = casesAdjusted.reduce((acc, curr) => acc + (curr?.totalPriceCents ?? 0), 0)
  const adjustedPotentialRevenue = Math.max(totalPotentialRevenue - totalAdjustedRevenue, 0)

  const percentagePaid =
    adjustedPotentialRevenue > 0 ? Math.round((totalPaymentCollected / adjustedPotentialRevenue) * 100) : 0

  return {
    totalCasesDelivered,
    totalCasesAdjusted,
    totalCasesAvailable,
    totalCasesCheckoutRequests,
    totalMoneyDue,
    percentagePaid,
  }
}
