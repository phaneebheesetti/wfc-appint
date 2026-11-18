import { and, eq, inArray, isNull } from "drizzle-orm"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaigns, campaignsUsers } from "@/server/db/schema"

export const campaignsGetActiveCampaignsByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.userId, input.userId),
  })

  const campaignIds = campaignsUsersData.map(campaignUser => campaignUser.campaignId)

  return database.query.campaigns.findMany({
    where: and(
      inArray(campaigns.id, campaignIds),
      eq(campaigns.status, CampaignsStatusEnum.ACTIVE),
      isNull(campaigns.deletedAt)
    ),
    with: {
      casesTransactions: true,
    },
    orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
  })
}
