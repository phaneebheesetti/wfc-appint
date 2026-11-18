import { and, eq, inArray } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions, users } from "@/server/db/schema"
import { getTotalCasesDelivered } from "@/utils/cases-transactions"
import { getUserDisplayName } from "@/utils/users"

export const campaignsUsersListWithoutCheckoutByParentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}) => {
  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: inArray(
      campaignsUsers.userId,
      database.select({ id: users.id }).from(users).where(eq(users.parentUserId, input.parentId))
    ),
    with: {
      campaign: {
        with: {
          casesTransactions: true,
        },
      },
      organization: true,
      user: true,
    },
  })

  const childUserIds = Array.from(new Set(campaignsUsersData.map(campaignUser => campaignUser.user.id)))

  const checkoutTransactions = await database.query.casesTransactions.findMany({
    where: and(
      inArray(casesTransactions.userId, childUserIds),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    columns: {
      userId: true,
      campaignId: true,
      quantity: true,
    },
  })

  // Create a set of user-campaign combinations that have checkouts
  const userCampaignsWithCheckouts = new Set<string>()
  for (const transaction of checkoutTransactions) {
    if (transaction.userId && transaction.campaignId) {
      userCampaignsWithCheckouts.add(`${transaction.userId}-${transaction.campaignId}`)
    }
  }

  // Filter enrolled campaigns to only those without checkouts
  const campaignsWithoutCheckouts = campaignsUsersData.filter(campaignUser => {
    const key = `${campaignUser.user.id}-${campaignUser.campaign.id}`
    return !userCampaignsWithCheckouts.has(key)
  })

  // Decrypt contact info and format results
  const result = []
  for (const enrollment of campaignsWithoutCheckouts) {
    const { campaign, organization, user, permissionSlipSignedAt } = enrollment
    if (!campaign || !user) continue

    const userFullName = getUserDisplayName(user, "Unknown User")

    const totalCasesDelivered = getTotalCasesDelivered(campaign?.casesTransactions ?? [])

    result.push({
      userId: user.id,
      userFullName,
      permissionSlipSignedAt,
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignCasesGoal: totalCasesDelivered,
      organizationName: organization.name,
    })
  }

  return result
}
