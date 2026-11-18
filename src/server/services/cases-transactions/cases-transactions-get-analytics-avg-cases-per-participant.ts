import { and, eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions } from "@/server/db/schema"

export const casesTransactionsGetAnalyticsAvgCasesPerParticipant = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const casesTransactionsResult = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
  })

  const totalCasesCheckedOut = casesTransactionsResult.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalParticipants = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.campaignId, input.campaignId),
  })

  const avgCasesPerParticipant = totalCasesCheckedOut / totalParticipants.length

  return parseFloat(avgCasesPerParticipant.toFixed(2))
}
