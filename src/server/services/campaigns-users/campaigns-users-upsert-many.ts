import { sql } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"

export const campaignsUsersUpsertMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; campaignId: string; userIds: string[] }
}) => {
  await database
    .insert(campaignsUsers)
    .values(
      input.userIds.map(userId => ({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        userId,
      }))
    )
    .onConflictDoUpdate({
      target: [campaignsUsers.userId, campaignsUsers.campaignId],
      set: {
        userId: sql`excluded.user_id`,
        campaignId: sql`excluded.campaign_id`,
      },
    })
}
