import { differenceInDays } from "date-fns"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import {
  campaigns,
  campaignsUsers,
  casesTransactions,
  participantParentUsers,
  paymentLogs,
  users,
} from "@/server/db/schema"

export const campaignsGetHeaderMetrics = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const campaign = await database.query.campaigns.findFirst({
    where: eq(campaigns.id, input.campaignId),
  })

  let lastDayOfCampaign = new Date(campaign?.endDate ?? new Date())
  if (lastDayOfCampaign > new Date()) {
    lastDayOfCampaign = new Date()
  }

  let dayPassed = differenceInDays(lastDayOfCampaign, new Date(campaign?.startDate ?? new Date()))
  if (dayPassed < 0) {
    dayPassed = 0
  }

  let campaignDaysTotal = differenceInDays(
    new Date(campaign?.endDate ?? new Date()),
    new Date(campaign?.startDate ?? new Date())
  )
  if (campaignDaysTotal <= 0) {
    campaignDaysTotal = 1
  }

  const casesTransactionsResult = await database.query.casesTransactions.findMany({
    where: eq(casesTransactions.campaignId, input.campaignId),
  })

  const paymentLogsResult = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const casesDelivered = casesTransactionsResult.filter(
    transaction => transaction.type === (CasesTransactionsTypeEnum.DELIVERED as string)
  )

  const casesCheckedOut = casesTransactionsResult.filter(
    transaction => transaction.type === (CasesTransactionsTypeEnum.CHECKOUT as string)
  )

  // Inventory adjustments are only counted when the feature flag is on
  const casesAdjusted =
    env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
      ? casesTransactionsResult.filter(
          transaction => transaction.type === (CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT as string)
        )
      : []

  const totalCasesDelivered = casesDelivered.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalCasesCheckedOut = casesCheckedOut.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalCasesAdjusted = casesAdjusted.reduce((acc, curr) => acc + curr.quantity, 0)

  const totalPaymentAdjusted = casesAdjusted.reduce((acc, curr) => acc + (curr?.totalPriceCents ?? 0), 0)

  const totalPaymentOwed = casesCheckedOut.reduce((acc, curr) => {
    return acc + (curr?.totalPriceCents ?? 0)
  }, 0)

  const totalPaymentExpected = casesDelivered.reduce((acc, curr) => {
    return acc + (curr?.totalPriceCents ?? 0)
  }, 0)

  const totalPaymentCollected = paymentLogsResult.reduce((acc, curr) => acc + (curr?.amountCents ?? 0), 0)

  const campaignParticipantsResult = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.campaignId, input.campaignId),
  })

  const participantIds = campaignParticipantsResult.map(p => p.userId)

  // from users table
  const legacyParticipants = participantIds.length
    ? await database.query.users.findMany({
        where: inArray(users.id, participantIds),
        columns: {
          id: true,
          parentUserId: true,
        },
      })
    : []

  const legacyParentIds = legacyParticipants
    .map(participant => participant.parentUserId)
    .filter((id): id is string => !!id)

  // from participantParentMappingTable
  const parentMappings = await database.query.participantParentUsers.findMany({
    where: inArray(participantParentUsers.participantUserId, participantIds),
    columns: {
      parentUserId: true,
    },
  })

  const parentIds = [...legacyParentIds, ...parentMappings.map(mapping => mapping.parentUserId)]

  const uniqueParentIds = [...new Set(parentIds)]
  const parents = uniqueParentIds.length
    ? await database.query.users.findMany({
        where: inArray(users.id, uniqueParentIds),
        columns: {
          id: true,
          status: true,
        },
      })
    : []
  const activeParents = new Set<string>()
  const pendingParents = new Set<string>()

  parents.forEach(parent => {
    if (parent.status === UsersStatusEnum.PENDING) {
      pendingParents.add(parent.id)
    }

    if (parent.status === UsersStatusEnum.ACTIVE) {
      activeParents.add(parent.id)
    }
  })

  const totalParticipantsCount = campaignParticipantsResult.length
  const totalParticipantsIds = new Set(campaignParticipantsResult.map(participant => participant.userId))

  const participantBalances = new Map<string, { owed: number; paid: number }>()

  // Total owed from checkout transactions
  casesCheckedOut.forEach(transaction => {
    if (!transaction.userId || !totalParticipantsIds.has(transaction.userId)) return

    const current = participantBalances.get(transaction.userId) ?? {
      owed: 0,
      paid: 0,
    }

    current.owed += transaction.totalPriceCents ?? 0
    participantBalances.set(transaction.userId, current)
  })

  // Total paid from completed payment logs
  paymentLogsResult.forEach(payment => {
    if (!payment.userId || !totalParticipantsIds.has(payment.userId)) return

    const current = participantBalances.get(payment.userId) ?? {
      owed: 0,
      paid: 0,
    }

    current.paid += payment.amountCents ?? 0
    participantBalances.set(payment.userId, current)
  })

  let participantsPaid = 0
  let totalPaymentDue = 0

  participantBalances.forEach(balance => {
    if (balance.owed > 0 && balance.paid >= balance.owed) {
      participantsPaid++
    }

    totalPaymentDue += Math.max(0, balance.owed - balance.paid)
  })

  const uniqueParticipantsCount = new Set(
    casesCheckedOut
      .filter(transaction => transaction.userId !== null && totalParticipantsIds.has(transaction.userId))
      .map(transaction => transaction.userId)
  ).size

  return {
    totalCasesDelivered,
    totalCasesCheckedOut,
    totalPaymentOwed: totalPaymentOwed ? totalPaymentOwed / 100 : 0,
    totalPaymentDue: totalPaymentDue ? totalPaymentDue / 100 : 0,
    totalPaymentCollected: totalPaymentCollected ? totalPaymentCollected / 100 : 0,
    totalPaymentExpected: totalPaymentExpected ? totalPaymentExpected / 100 : 0,
    totalCasesAdjusted,
    totalPaymentAdjusted: totalPaymentAdjusted ? totalPaymentAdjusted / 100 : 0,
    totalParticipants: totalParticipantsCount,
    totalParticipantsEngagement: uniqueParticipantsCount,
    totalParentsPending: pendingParents.size,
    totalParentsActive: activeParents.size,
    participantsPaid,
    dayPassed,
    campaignDaysTotal,
  }
}
