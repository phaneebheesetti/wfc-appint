import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { prizes } from "@/server/db/schema"

export const prizesListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  return database.query.prizes.findMany({
    where: eq(prizes.campaignId, input.campaignId),
    with: {
      previousPrize: true,
      nextPrize: true,
    },
    orderBy: (prizes, { asc }) => [asc(prizes.name)],
  })
}
