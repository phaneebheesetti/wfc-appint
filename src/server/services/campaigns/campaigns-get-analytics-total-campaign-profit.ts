import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { casesTransactions, paymentLogs } from "@/server/db/schema"

export const campaignsGetAnalyticsTotalCampaignProfit = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const casesDeliveredResult = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.DELIVERED)
    ),
  })

  const paymentLogsResult = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const freeCasesSellPriceCents = casesDeliveredResult.reduce((acc, curr) => {
    if (curr.costPerCaseCents === 0) {
      return acc + curr.quantity * (curr.pricePerCaseCents ?? 0)
    }
    return acc
  }, 0)

  const totalPaymentCollectedCents = paymentLogsResult.reduce((acc, curr) => acc + (curr?.amountCents ?? 0), 0)
  const nonFreeCaseDelivered = casesDeliveredResult.find(transaction => (transaction.pricePerCaseCents ?? 0) > 0)

  const percent = nonFreeCaseDelivered
    ? (nonFreeCaseDelivered?.profitPerCaseCents ?? 0) / (nonFreeCaseDelivered?.pricePerCaseCents ?? 0)
    : 0

  let totalCampaignProfitCents = 0
  if (totalPaymentCollectedCents < freeCasesSellPriceCents) {
    totalCampaignProfitCents = totalPaymentCollectedCents
  } else {
    totalCampaignProfitCents = freeCasesSellPriceCents
    const remainingPaymentCents = totalPaymentCollectedCents - totalCampaignProfitCents
    const organizationShareCents = remainingPaymentCents * percent
    totalCampaignProfitCents += organizationShareCents
  }

  return {
    totalCampaignProfit: totalCampaignProfitCents / 100,
  }
}
