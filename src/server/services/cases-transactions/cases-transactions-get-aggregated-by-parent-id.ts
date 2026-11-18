import { and, eq, inArray, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { casesTransactions, participantParentUsers, paymentLogs, users } from "@/server/db/schema"
import { getUserDisplayName } from "@/utils/users"

export const casesTransactionsGetAggregatedByParentId = async ({
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

  // Get all checkout transactions for child users
  const checkoutTransactions = await database.query.casesTransactions.findMany({
    where: and(
      inArray(casesTransactions.userId, childUserIds),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    with: {
      user: true,
      campaign: {
        columns: {
          name: true,
        },
      },
    },
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })

  // Get all payment logs for child users
  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      inArray(paymentLogs.userId, childUserIds),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  // Group by campaign and aggregate data
  const campaignAggregates = new Map<
    string,
    {
      campaignId: string
      campaignName: string
      totalCasesCheckedOut: number
      totalCasesPaid: number
      totalAmountOwedCents: number
      totalAmountPaidCents: number
      pricePerCaseCents: number
      participants: Set<string>
      participantNames: string[]
      createdAt: Date
    }
  >()

  // Process checkout transactions
  for (const transaction of checkoutTransactions) {
    if (!transaction.campaignId || !transaction.campaign) continue

    const key = transaction.campaignId
    if (!campaignAggregates.has(key)) {
      campaignAggregates.set(key, {
        campaignId: transaction.campaignId,
        campaignName: transaction.campaign.name,
        totalCasesCheckedOut: 0,
        totalCasesPaid: 0,
        totalAmountOwedCents: 0,
        totalAmountPaidCents: 0,
        pricePerCaseCents: transaction.pricePerCaseCents ?? 0,
        participants: new Set(),
        participantNames: [],
        createdAt: transaction.createdAt,
      })
    }

    const aggregate = campaignAggregates.get(key)!
    aggregate.totalCasesCheckedOut += transaction.quantity
    aggregate.totalAmountOwedCents += transaction.totalPriceCents ?? 0

    aggregate.participants.add(getUserDisplayName(transaction.user))
  }

  // Process payment logs and calculate paid cases
  for (const payment of paymentLogsData) {
    if (!payment.campaignId || !payment.amountCents) continue

    const aggregate = campaignAggregates.get(payment.campaignId)
    if (aggregate && aggregate.pricePerCaseCents > 0) {
      aggregate.totalAmountPaidCents += payment.amountCents
      // Calculate full cases paid (round down)
      aggregate.totalCasesPaid = Math.floor(aggregate.totalAmountPaidCents / aggregate.pricePerCaseCents)
    }
  }

  // Convert to array and add participant names
  return Array.from(campaignAggregates.values()).map(aggregate => ({
    ...aggregate,
    participantNames: Array.from(aggregate.participants),
  }))
}
