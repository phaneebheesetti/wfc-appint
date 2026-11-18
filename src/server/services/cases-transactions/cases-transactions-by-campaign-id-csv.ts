import { generateCsv } from "export-to-csv"
import { mkConfig } from "export-to-csv"

import type { db } from "@/server/db"
import { getCaseName } from "@/utils/cases-transactions"
import { getUserDisplayName } from "@/utils/users"

import { casesTransactionsGetByCampaignId } from "./cases-transactions-get-by-campaign-id"

export const casesTransactionsByCampaignIdCsv = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const transactions = await casesTransactionsGetByCampaignId({
    database,
    input,
  })

  if (!transactions || transactions.length === 0) {
    return null
  }

  const transactionsCsv = generateCsv(
    mkConfig({
      filename: `campaign-transactions`,
      useKeysAsHeaders: true,
    })
  )(
    transactions.map(transaction => {
      const caseName = getCaseName({
        pricePerBarCents: transaction.pricePerBarCents ?? 0,
        barsPerCase: transaction.barsPerCase ?? 60,
      })
      return {
        Date: transaction.createdAt.toLocaleDateString(),
        Type: transaction.type,
        Participant: getUserDisplayName(transaction.user),
        Quantity: transaction.quantity,
        Case: caseName,
      }
    })
  )

  return transactionsCsv
}
