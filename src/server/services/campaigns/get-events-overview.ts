import { and, eq } from "drizzle-orm"

import { EventGoalTypeEnum } from "@/constants/events"
import type { db } from "@/server/db"
import { type User, events } from "@/server/db/schema"

import { type UserBalance, campaignsGetBalanceOverview } from "./get-balance-overview"

type EventInfo = {
  id: string
  name: string
  goalType: EventGoalTypeEnum
  casesGoal: number
  prizeId: string | null
  participants: {
    all: User[]
    allIds: string[]
    allCount: number

    eligible: User[]
    eligibleIds: string[]
    eligibleCount: number

    unpaid: User[]
    unpaidIds: string[]
    unpaidCount: number
  }
}

export interface CampaignEventsOverview {
  campaignId: string
  eventsInfoById: Record<string, EventInfo>
  usersById: Record<string, User>
  usersBalanceById: Record<string, UserBalance>
  uniqueParticipantsCount: number
}

export const campaignsGetEventsOverview = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<CampaignEventsOverview> => {
  const campaignEvents = await database.query.events.findMany({
    where: and(eq(events.campaignId, input.campaignId), eq(events.active, true)),
  })

  const eventsInfoById: Record<string, EventInfo> = campaignEvents.reduce(
    (acc, event) => {
      acc[event.id] = {
        id: event.id,
        name: event.name,
        goalType: event.goalType as EventGoalTypeEnum,
        casesGoal: event.casesGoal ?? 0,
        prizeId: event.prizeId,
        participants: {
          all: [],
          allIds: [],
          allCount: 0,
          eligible: [],
          eligibleIds: [],
          eligibleCount: 0,
          unpaid: [],
          unpaidIds: [],
          unpaidCount: 0,
        },
      }
      return acc
    },
    {} as Record<string, EventInfo>
  )

  const { usersById, usersBalanceById } = await campaignsGetBalanceOverview({
    database,
    input: { campaignId: input.campaignId },
  })

  // Now process event eligibility based on user data
  Object.entries(usersBalanceById).forEach(([userId, userData]) => {
    // Check which events this user qualifies for
    Object.entries(eventsInfoById).forEach(([eventId, eventInfo]) => {
      const user = usersById?.[userId]

      if (!eventsInfoById[eventId] || !user?.id) return

      let isEligible = false
      let isUnpaidEligible = false

      switch (eventInfo.goalType) {
        case EventGoalTypeEnum.ALL_PARTICIPANTS:
          isEligible = true
          break
        case EventGoalTypeEnum.FIRST_PAYMENT_TURNED_IN:
          if (userData.casesCheckedOut > 0 && userData.casesPaid > 0) {
            isEligible = true
          }
          break
        case EventGoalTypeEnum.FIRST_CASE_CHECKOUT:
          if (userData.casesCheckedOut > 0) {
            isEligible = true
          }
          break
        case EventGoalTypeEnum.CASE_PAYMENT:
          if (userData.casesPaid >= eventInfo.casesGoal) {
            isEligible = true
          } else if (userData.casesCheckedOut >= eventInfo.casesGoal) {
            isUnpaidEligible = true
          }
          break
      }

      if (isEligible) {
        eventsInfoById[eventId].participants.eligible.push(user)
        eventsInfoById[eventId].participants.eligibleIds.push(userId)
        eventsInfoById[eventId].participants.eligibleCount++
      } else if (isUnpaidEligible) {
        eventsInfoById[eventId].participants.unpaid.push(user)
        eventsInfoById[eventId].participants.unpaidIds.push(userId)
        eventsInfoById[eventId].participants.unpaidCount++
      }

      if (isEligible || isUnpaidEligible) {
        eventsInfoById[eventId].participants.all.push(user)
        eventsInfoById[eventId].participants.allIds.push(userId)
        eventsInfoById[eventId].participants.allCount++
      }
    })
  })

  // Events don't have the same chaining structure as prizes, so no skipped logic needed

  const uniqueParticipantsCount = Object.keys(usersById).length

  return {
    campaignId: input.campaignId,
    eventsInfoById,
    usersById,
    usersBalanceById,
    uniqueParticipantsCount,
  }
}
