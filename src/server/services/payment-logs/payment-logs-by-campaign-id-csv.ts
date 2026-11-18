import { generateCsv } from "export-to-csv"
import { mkConfig } from "export-to-csv"

import type { db } from "@/server/db"
import { formatCentsToCurrency } from "@/utils/money"
import { getUserDisplayName } from "@/utils/users"

import { paymentLogsListByCampaignId } from "./payment-logs-list-by-campaign-id"

export const paymentLogsByCampaignIdCsv = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const paymentLogs = await paymentLogsListByCampaignId({
    database,
    input,
  })

  if (!paymentLogs || paymentLogs.length === 0) {
    return null
  }

  return generateCsv(mkConfig({ filename: `campaign-payment-logs`, useKeysAsHeaders: true }))(
    paymentLogs.map(paymentLog => {
      return {
        Date: paymentLog.createdAt.toLocaleDateString(),
        Type: paymentLog.type,
        Amount: formatCentsToCurrency(paymentLog.amountCents),
        User: getUserDisplayName(paymentLog.user),
      }
    })
  )
}
