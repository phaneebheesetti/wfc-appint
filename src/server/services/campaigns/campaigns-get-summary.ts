import type { db } from "@/server/db"
import { uploadCampaignSummaryCsv } from "@/utils/campaigns"

import { casesTransactionsByCampaignIdCsv } from "../cases-transactions"
import { paymentLogsByCampaignIdCsv } from "../payment-logs"
import { prizesByCampaignIdCsv } from "../prizes"
import { campaignsGetSummaryCsv } from "./campaigns-get-summary-csv"

export const campaignsGetSummary = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<{
  campaignCsvUrl: string | null
  casesTransactionsCsvUrl: string | null
  paymentLogsCsvUrl: string | null
  prizesCsvUrl: string | null
}> => {
  const [campaignSummaryCsv, prizesCsv, casesTransactionsCsv, paymentLogsCsv] = await Promise.all([
    campaignsGetSummaryCsv({ database, input: { campaignId: input.campaignId } }),
    prizesByCampaignIdCsv({ database, input: { campaignId: input.campaignId } }),
    casesTransactionsByCampaignIdCsv({ database, input: { campaignId: input.campaignId } }),
    paymentLogsByCampaignIdCsv({ database, input: { campaignId: input.campaignId } }),
  ])

  let campaignCsvUrl: string | null = null
  let prizesCsvUrl: string | null = null
  let casesTransactionsCsvUrl: string | null = null
  let paymentLogsCsvUrl: string | null = null

  const date = new Date()

  if (campaignSummaryCsv) {
    campaignCsvUrl = await uploadCampaignSummaryCsv({
      campaignId: input.campaignId,
      fileName: `campaign-summary-${date.toISOString()}.csv`,
      fileContent: campaignSummaryCsv,
    })
  }
  if (prizesCsv) {
    prizesCsvUrl = await uploadCampaignSummaryCsv({
      campaignId: input.campaignId,
      fileName: `campaign-prizes-${date.toISOString()}.csv`,
      fileContent: prizesCsv,
    })
  }
  if (casesTransactionsCsv) {
    casesTransactionsCsvUrl = await uploadCampaignSummaryCsv({
      campaignId: input.campaignId,
      fileName: `campaign-cases-transactions-${date.toISOString()}.csv`,
      fileContent: casesTransactionsCsv,
    })
  }
  if (paymentLogsCsv) {
    paymentLogsCsvUrl = await uploadCampaignSummaryCsv({
      campaignId: input.campaignId,
      fileName: `campaign-payment-logs-${date.toISOString()}.csv`,
      fileContent: paymentLogsCsv,
    })
  }

  return {
    campaignCsvUrl,
    prizesCsvUrl,
    casesTransactionsCsvUrl,
    paymentLogsCsvUrl,
  }
}
