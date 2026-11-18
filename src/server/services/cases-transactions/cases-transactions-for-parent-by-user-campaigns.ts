import { and, eq, inArray } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions, participantParentUsers, users } from "@/server/db/schema"
import { getUserDisplayName } from "@/utils/users"

export const casesTransactionsForParentByUserCampaigns = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}) => {
  // Get all child users for this parent
  const [directUsers, mappingRows] = await Promise.all([
    database.query.users.findMany({
      where: eq(users.parentUserId, input.parentId),
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    }),
    database.query.participantParentUsers.findMany({
      where: eq(participantParentUsers.parentUserId, input.parentId),
    }),
  ])
  const participantids = mappingRows.map(id => id.participantUserId)

  const mappedUsers = participantids.length
    ? await database.query.users.findMany({
        where: inArray(users.id, participantids),
      })
    : []

  const childUsers = [...directUsers, ...mappedUsers].filter(
    (user, index, self) => index === self.findIndex(u => u.id === user.id)
  )

  if (childUsers.length === 0) {
    return []
  }

  const childUserIds = childUsers.map(user => user.id)

  // Get all checkout transactions for child users with campaign and organization data
  const checkoutTransactions = await database.query.casesTransactions.findMany({
    where: and(
      inArray(casesTransactions.userId, childUserIds),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    with: {
      user: true,
      campaign: true,
      organization: true,
    },
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })

  const allCheckoutTransactions = await database.query.casesTransactions.findMany({
    where: and(eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)),
  })

  // Calculate total cases checked out per campaign (for progress calculation)
  const campaignTotalCasesCheckedOutMap = new Map<string, number>()
  for (const transaction of allCheckoutTransactions) {
    if (transaction.campaignId) {
      const current = campaignTotalCasesCheckedOutMap.get(transaction.campaignId) ?? 0
      campaignTotalCasesCheckedOutMap.set(transaction.campaignId, current + transaction.quantity)
    }
  }

  const allDeliveredTransactions = await database.query.casesTransactions.findMany({
    where: and(eq(casesTransactions.type, CasesTransactionsTypeEnum.DELIVERED)),
  })

  // Calculate total cases delivered per campaign (for progress calculation)
  const campaignTotalCasesDeliveredMap = new Map<string, number>()
  for (const transaction of allDeliveredTransactions) {
    if (transaction.campaignId) {
      const current = campaignTotalCasesDeliveredMap.get(transaction.campaignId) ?? 0
      campaignTotalCasesDeliveredMap.set(transaction.campaignId, current + transaction.quantity)
    }
  }

  // Group by user-campaign combination
  const userCampaignMap = new Map<
    string,
    {
      userId: string
      userPin: string | null
      userFullName: string
      organizationId: string
      organizationName: string
      campaignId: string
      campaignName: string
      campaignCasesGoal: number
      campaignDigitalPayment: boolean
      campaignUserId: string
      totalCasesCheckedOutByUser: number
      totalCasesCheckedOutByCampaign: number
      progress: number
      createdAt: Date
      grade: string | null
      teacherName: string | null
    }
  >()

  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: inArray(campaignsUsers.userId, childUserIds),
    columns: {
      id: true,
      userId: true,
      campaignId: true,
    },
  })

  // Process transactions to build user-campaign combinations
  for (const transaction of checkoutTransactions) {
    if (!transaction.campaignId || !transaction.campaign || !transaction.userId) continue

    const key = `${transaction.userId}-${transaction.campaignId}`
    const user = childUsers.find(u => u.id === transaction.userId)
    const campaignUser = campaignsUsersData.find(
      cu => cu.userId === transaction.userId && cu.campaignId === transaction.campaignId
    )

    if (!user || !campaignUser) continue

    const campaignTotalCasesCheckedOut = campaignTotalCasesCheckedOutMap.get(transaction.campaignId) ?? 0
    const campaignTotalCasesDelivered = campaignTotalCasesDeliveredMap.get(transaction.campaignId) ?? 0

    const progress =
      campaignTotalCasesDelivered > 0
        ? Math.round((campaignTotalCasesCheckedOut / campaignTotalCasesDelivered) * 100)
        : 0

    if (!userCampaignMap.has(key)) {
      const organizationName = transaction.organization?.name ?? ""

      userCampaignMap.set(key, {
        userId: transaction.userId,
        userPin: user.pin,
        userFullName: getUserDisplayName(user, "Unknown"),
        organizationId: transaction.organizationId,
        organizationName,
        campaignId: transaction.campaignId,
        campaignName: transaction.campaign.name,
        campaignCasesGoal: campaignTotalCasesDelivered,
        campaignDigitalPayment: transaction.campaign.digitalPayment,
        campaignUserId: campaignUser.id,
        totalCasesCheckedOutByUser: 0,
        totalCasesCheckedOutByCampaign: campaignTotalCasesCheckedOut,
        progress,
        createdAt: transaction.createdAt,
        grade: user?.grade ?? null,
        teacherName: user?.teacherName ?? null,
      })
    }

    const userCampaign = userCampaignMap.get(key)!
    userCampaign.totalCasesCheckedOutByUser += transaction.quantity
  }

  return Array.from(userCampaignMap.values())
}
