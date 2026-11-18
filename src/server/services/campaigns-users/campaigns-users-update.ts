import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type CampaignUserInsert, campaignsUsers } from "@/server/db/schema"

export const campaignsUsersUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<CampaignUserInsert>
}) => {
  const [updatedCampaignUser] = await database
    .update(campaignsUsers)
    .set(input)
    .where(eq(campaignsUsers.id, input.id!))
    .returning()

  return updatedCampaignUser ?? null
}
