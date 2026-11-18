import type { db } from "@/server/db"
import { type CampaignAnnouncementInsert, campaignAnnouncements } from "@/server/db/schema"

export const campaignAnnouncementsCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: CampaignAnnouncementInsert
}) => {
  const [createdCampaignAnnouncement] = await database.insert(campaignAnnouncements).values(input).returning()

  return createdCampaignAnnouncement
}
