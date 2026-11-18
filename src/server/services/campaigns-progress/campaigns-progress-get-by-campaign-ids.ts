import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { campaignsProgress } from "@/server/db/schema"

export const campaignsProgressGetByCampaignIds = async ({
  database,
  campaignIds,
}: {
  database: typeof db
  campaignIds: string[]
}) => {
  return database.query.campaignsProgress.findMany({
    where: inArray(campaignsProgress.campaignId, campaignIds),
  })
}
