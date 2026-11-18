import { and, eq } from "drizzle-orm"
import differenceBy from "lodash.differenceby"
import intersectionBy from "lodash.intersectionby"

import { PrizeGoalTypeEnum } from "@/constants/prize"
import type { db } from "@/server/db"
import { type User, prizes } from "@/server/db/schema"

import { type UserBalance, campaignsGetBalanceOverview } from "./get-balance-overview"

export type PrizeInfo = {
  id: string
  name: string
  goalType: PrizeGoalTypeEnum
  casesGoal: number
  previousPrizeId: string | null
  nextPrizeId: string | null
  participants: {
    all: User[]
    allIds: string[]
    allCount: number

    eligible: User[]
    eligibleIds: string[]
    eligibleCount: number

    skippedEligible: User[]
    skippedEligibleIds: string[]
    skippedEligibleCount: number

    skippedUnpaid: User[]
    skippedUnpaidIds: string[]
    skippedUnpaidCount: number

    unpaid: User[]
    unpaidIds: string[]
    unpaidCount: number
  }
}

export interface CampaignPrizesOverview {
  campaignId: string
  prizesInfoById: Record<string, PrizeInfo>
  usersById: Record<string, User>
  usersBalanceById: Record<string, UserBalance>
  uniqueParticipantsCount: number
}

export const campaignsGetPrizesOverview = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<CampaignPrizesOverview> => {
  const campaignPrizes = await database.query.prizes.findMany({
    where: and(eq(prizes.campaignId, input.campaignId), eq(prizes.active, true)),
  })

  let prizesInfoById: Record<string, PrizeInfo> = campaignPrizes.reduce(
    (acc, prize) => {
      acc[prize.id] = {
        id: prize.id,
        name: prize.name,
        goalType: prize.goalType as PrizeGoalTypeEnum,
        casesGoal: prize.casesGoal ?? 0,
        previousPrizeId: prize.previousPrizeId,
        nextPrizeId: prize.nextPrizeId,
        participants: {
          all: [],
          allIds: [],
          allCount: 0,
          eligible: [],
          eligibleIds: [],
          eligibleCount: 0,
          skippedEligible: [],
          skippedEligibleIds: [],
          skippedEligibleCount: 0,
          skippedUnpaid: [],
          skippedUnpaidIds: [],
          skippedUnpaidCount: 0,
          unpaid: [],
          unpaidIds: [],
          unpaidCount: 0,
        },
      }
      return acc
    },
    {} as Record<string, PrizeInfo>
  )

  const { usersById, usersBalanceById } = await campaignsGetBalanceOverview({
    database,
    input: { campaignId: input.campaignId },
  })

  // Now process prize eligibility based on user data
  Object.entries(usersBalanceById).forEach(([userId, userData]) => {
    // Check which prizes this user qualifies for
    Object.entries(prizesInfoById).forEach(([prizeId, prizeInfo]) => {
      const user = usersById?.[userId]

      if (!prizesInfoById[prizeId] || !user?.id) return

      let isEligible = false
      let isUnpaidEligible = false

      switch (prizeInfo.goalType) {
        case PrizeGoalTypeEnum.ALL_PARTICIPANTS:
          isEligible = true
          break
        case PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN:
          if (userData.casesCheckedOut > 0 && userData.casesPaid > 0) {
            isEligible = true
          }
          break
        case PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT:
          if (userData.casesCheckedOut > 0) {
            isEligible = true
          }
          break
        case PrizeGoalTypeEnum.CASE_PAYMENT:
          if (userData.casesPaid >= prizeInfo.casesGoal) {
            isEligible = true
          } else if (userData.casesCheckedOut >= prizeInfo.casesGoal) {
            isUnpaidEligible = true
          }
          break
      }

      if (isEligible) {
        prizesInfoById[prizeId].participants.eligible.push(user)
        prizesInfoById[prizeId].participants.eligibleIds.push(userId)
        prizesInfoById[prizeId].participants.eligibleCount++
      } else if (isUnpaidEligible) {
        prizesInfoById[prizeId].participants.unpaid.push(user)
        prizesInfoById[prizeId].participants.unpaidIds.push(userId)
        prizesInfoById[prizeId].participants.unpaidCount++
      }

      if (isEligible || isUnpaidEligible) {
        prizesInfoById[prizeId].participants.all.push(user)
        prizesInfoById[prizeId].participants.allIds.push(userId)
        prizesInfoById[prizeId].participants.allCount++
      }
    })
  })

  const newPrizesInfoById: Record<string, PrizeInfo> = {}

  // Check if there are any skipped
  // skipped means that since the user is eligible for the next prize, he is not eligible for the current prize
  Object.entries(prizesInfoById).forEach(([prizeId, prizeInfo]) => {
    if (!prizeInfo.nextPrizeId) return

    const currentPrizeInfo = prizesInfoById?.[prizeId]
    const nextPrizeInfo = prizesInfoById?.[prizeInfo.nextPrizeId]
    if (!currentPrizeInfo || !nextPrizeInfo) return

    const { eligible: currentPrizeEligible, unpaid: currentPrizeUnpaid } = currentPrizeInfo.participants
    const { eligible: nextPrizeEligible, unpaid: nextPrizeUnpaid } = nextPrizeInfo.participants

    const skippedEligibleParticipants = intersectionBy(currentPrizeEligible, nextPrizeEligible, "id")
    const skippedUnpaidParticipants = intersectionBy(currentPrizeUnpaid, nextPrizeUnpaid, "id")
    if (skippedEligibleParticipants.length === 0 && skippedUnpaidParticipants.length === 0) return

    const eligibleParticipants = differenceBy(currentPrizeEligible, skippedEligibleParticipants, "id")
    const unpaidParticipants = differenceBy(currentPrizeUnpaid, skippedUnpaidParticipants, "id")

    const allParticipants = [
      ...eligibleParticipants,
      ...skippedEligibleParticipants,
      ...unpaidParticipants,
      ...skippedUnpaidParticipants,
    ]

    const newPrizeInfo = {
      ...currentPrizeInfo,
      participants: {
        ...currentPrizeInfo.participants,
        all: allParticipants,
        allIds: allParticipants.map(participant => participant.id),
        allCount: allParticipants.length,
        eligible: eligibleParticipants,
        eligibleIds: eligibleParticipants.map(participant => participant.id),
        eligibleCount: eligibleParticipants.length,
        skippedEligible: skippedEligibleParticipants,
        skippedEligibleIds: skippedEligibleParticipants.map(participant => participant.id),
        skippedEligibleCount: skippedEligibleParticipants.length,
        unpaid: unpaidParticipants,
        unpaidIds: unpaidParticipants.map(participant => participant.id),
        unpaidCount: unpaidParticipants.length,
        skippedUnpaid: skippedUnpaidParticipants,
        skippedUnpaidIds: skippedUnpaidParticipants.map(participant => participant.id),
        skippedUnpaidCount: skippedUnpaidParticipants.length,
      },
    }

    newPrizesInfoById[prizeId] ??= newPrizeInfo
  })

  prizesInfoById = {
    ...prizesInfoById,
    ...newPrizesInfoById,
  }

  const uniqueParticipantsCount = Object.keys(usersById).length

  return {
    campaignId: input.campaignId,
    prizesInfoById,
    usersById,
    usersBalanceById,
    uniqueParticipantsCount,
  }
}
