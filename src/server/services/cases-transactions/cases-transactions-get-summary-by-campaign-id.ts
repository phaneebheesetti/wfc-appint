import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"
import { getTotalCasesCheckedOut, getTotalCasesDelivered } from "@/utils/cases-transactions"

export const casesTransactionsGetSummaryByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const casesTransactionsData = await database.query.casesTransactions.findMany({
    where: eq(casesTransactions.campaignId, input.campaignId),
  })

  const casesCheckedOut = getTotalCasesCheckedOut(casesTransactionsData)
  const casesDelivered = getTotalCasesDelivered(casesTransactionsData)

  return {
    casesCheckedOut,
    casesDelivered,
  }
}
