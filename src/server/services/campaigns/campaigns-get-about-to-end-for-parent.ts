import { differenceInDays } from "date-fns"
import { eq, inArray } from "drizzle-orm"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaignsUsers, users } from "@/server/db/schema"
import { getUserDisplayName } from "@/utils/users"

export const campaignsGetAboutToEndForParent = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string; status?: CampaignsStatusEnum }
}) => {
  const { parentId, status } = input
  const childUsers = await database.query.users.findMany({
    where: eq(users.parentUserId, parentId),
  })

  if (childUsers.length === 0) {
    return []
  }

  const childUserIds = childUsers.map(user => user.id)

  const campaignsUsersResult = await database.query.campaignsUsers.findMany({
    where: inArray(campaignsUsers.userId, childUserIds),
    with: {
      campaign: true,
      organization: true,
      user: true,
    },
  })

  let filteredCampaigns = campaignsUsersResult
  if (status) {
    filteredCampaigns = campaignsUsersResult.filter(cu => cu.campaign.status === status.toString())
  }

  if (status === CampaignsStatusEnum.ACTIVE) {
    const fiveDaysFromNow = new Date()
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

    filteredCampaigns = filteredCampaigns.filter(cu => {
      const endDate = new Date(cu.campaign.endDate)
      return endDate <= fiveDaysFromNow
    })
  }

  return filteredCampaigns.map(cu => ({
    campaignId: cu.campaign.id,
    campaignName: cu.campaign.name,
    endDate: cu.campaign.endDate,
    daysRemaining: Math.max(0, differenceInDays(new Date(cu.campaign.endDate), new Date())),
    participantName: getUserDisplayName(cu.user),
    organizationName: cu.organization.name,
  }))
}
