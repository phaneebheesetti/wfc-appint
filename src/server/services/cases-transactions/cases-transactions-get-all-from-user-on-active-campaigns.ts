import { and, eq, inArray } from "drizzle-orm"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions } from "@/server/db/schema"

export const casesTransactionsGetAllFromUserOnActiveCampaigns = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.userId, input.userId),
    with: { campaign: true },
  })

  const activeCampaignIds = campaignsUsersData
    .filter(campaignUser => (campaignUser.campaign.status as CampaignsStatusEnum) === CampaignsStatusEnum.ACTIVE)
    .map(campaignUser => campaignUser.campaignId)
    .filter((campaignId): campaignId is string => campaignId !== null)

  return database.query.casesTransactions.findMany({
    where: and(eq(casesTransactions.userId, input.userId), inArray(casesTransactions.campaignId, activeCampaignIds)),
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })
}
