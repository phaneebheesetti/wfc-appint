import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { campaignsProgress } from "@/server/db/schema"

export const campaignsProgressGetByCampaignId = async ({
  database,
  campaignId,
}: {
  database: typeof db
  campaignId: string
}) => {
  const progress = await database.query.campaignsProgress.findFirst({
    where: eq(campaignsProgress.campaignId, campaignId),
  })

  return progress ?? null
}
