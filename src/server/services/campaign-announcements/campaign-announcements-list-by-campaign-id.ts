import { and, eq, notInArray } from "drizzle-orm"

import { type CampaignAnnouncementTypeEnum } from "@/constants/campaign-announcements"
import type { db } from "@/server/db"
import { campaignAnnouncements } from "@/server/db/schema"

export type CampaignAnnouncementsListByCampaignIdInput = {
  campaignId: string
  excludeTypes?: CampaignAnnouncementTypeEnum[]
}

export const campaignAnnouncementsListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: CampaignAnnouncementsListByCampaignIdInput
}) => {
  const { campaignId, excludeTypes } = input

  return database.query.campaignAnnouncements.findMany({
    where: and(
      eq(campaignAnnouncements.campaignId, campaignId),
      excludeTypes?.length ? notInArray(campaignAnnouncements.type, excludeTypes) : undefined
    ),
    with: {
      createdByUser: true,
    },
    orderBy: (campaignAnnouncementsTable, { desc }) => [desc(campaignAnnouncementsTable.createdAt)],
  })
}
