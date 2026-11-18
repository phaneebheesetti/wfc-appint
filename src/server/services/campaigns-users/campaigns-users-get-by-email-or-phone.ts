import { and, eq, inArray, or } from "drizzle-orm"

import { type db } from "@/server/db"
import { type CampaignUser, campaigns, campaignsUsers, users } from "@/server/db/schema"

export const campaignsUsersGetByEmailOrPhone = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string; email?: string; phone?: string }
}): Promise<CampaignUser | null> => {
  const emails = input.email ? [input.email] : []
  const phones = input.phone ? [input.phone] : []
  if (emails.length === 0 && phones.length === 0) return null

  const normalizedEmails = emails.map(e => e.trim().toLowerCase())
  const campaignUsers = await database
    .select()
    .from(campaignsUsers)
    .innerJoin(campaigns, eq(campaignsUsers.campaignId, campaigns.id))
    .innerJoin(users, eq(campaignsUsers.userId, users.id))
    .where(
      and(eq(campaigns.id, input.campaignId), or(inArray(users.email, normalizedEmails), inArray(users.phone, phones)))
    )

  const first = campaignUsers[0]
  if (!first) return null

  return {
    ...first.campaigns_users,
    user: {
      ...first.users,
    },
  } as CampaignUser
}
