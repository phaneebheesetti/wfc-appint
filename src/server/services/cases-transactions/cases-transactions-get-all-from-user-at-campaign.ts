import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

export const casesTransactionsGetAllFromUserAtCampaign = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId: string }
}) => {
  return database.query.casesTransactions.findMany({
    where: and(eq(casesTransactions.userId, input.userId), eq(casesTransactions.campaignId, input.campaignId)),
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })
}
