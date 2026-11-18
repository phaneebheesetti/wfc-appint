import { and, eq, inArray, isNull, ne } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import {
  campaigns,
  campaignsProgress,
  campaignsUsers,
  casesTransactions,
  documents,
  events,
  prizes,
} from "@/server/db/schema"

export const campaignsGetCampaignForOrgAdmin = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const campaignsData = (
    await database.query.campaigns.findMany({
      where: and(
        eq(campaigns.sponsorId, input.userId),
        isNull(campaigns.deletedAt),
        ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
        eq(campaigns.status, UsersStatusEnum.ACTIVE)
      ),
      orderBy: (campaigns, { asc }) => [asc(campaigns.createdAt)],
      with: {
        sponsor: true,
        organization: true,
      },
    })
  ).filter(campaign => campaign.organization?.deletedAt == null)

  if (!campaignsData.length) {
    return null
  }

  const campaignIds = campaignsData.map(campaign => campaign.id)
  const progressData = await database.query.campaignsProgress.findMany({
    where: inArray(campaignsProgress.campaignId, campaignIds),
  })

  const prizesData = await database.query.prizes.findMany({
    where: inArray(prizes.campaignId, campaignIds),
    columns: {
      campaignId: true,
    },
  })

  const eventsData = await database.query.events.findMany({
    where: inArray(events.campaignId, campaignIds),
    columns: {
      campaignId: true,
    },
  })

  const documentsData = await database.query.documents.findMany({
    where: inArray(documents.campaignId, campaignIds),
    columns: {
      campaignId: true,
    },
  })

  const participantsData = await database.query.campaignsUsers.findMany({
    where: inArray(campaignsUsers.campaignId, campaignIds),
    columns: {
      campaignId: true,
    },
  })

  const inventoryData = await database.query.casesTransactions.findMany({
    where: inArray(casesTransactions.campaignId, campaignIds),
    columns: {
      campaignId: true,
    },
  })

  return campaignsData.map(campaign => {
    const progress = progressData.find(item => item.campaignId === campaign.id)

    return {
      ...campaign,

      hasPrizeAndEventSetup:
        prizesData.some(prize => prize.campaignId === campaign.id) ||
        eventsData.some(event => event.campaignId === campaign.id) ||
        progress?.setupProgress?.prizesAndEventsSaved === true,

      hasStripeSetup:
        !campaign.digitalPayment ||
        Boolean(campaign.organization?.stripeConnectedAccountId) ||
        progress?.setupProgress?.stripeSaved === true,

      hasPermissionSlipSetup:
        documentsData.some(document => document.campaignId === campaign.id) ||
        progress?.setupProgress?.permissionSlipSaved === true,

      hasFinalReviewCompleted: progress?.setupProgress?.finalReviewCompleted === true,

      hasParticipants: participantsData.some(participant => participant.campaignId === campaign.id),

      hasInventory: inventoryData.some(transaction => transaction.campaignId === campaign.id),
    }
  })
}
