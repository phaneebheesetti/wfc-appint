import { and, eq, ne } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { env } from "@/env"
import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

export const casesTransactionsGetByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const casesTransactionsData = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      // Inventory adjustments are hidden when the feature flag is off
      env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
        ? undefined
        : ne(casesTransactions.type, CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT)
    ),
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
    with: {
      user: true,
      createdByUser: true,
    },
  })

  return casesTransactionsData
}
