import { EventGoalTypeEnum } from "@/constants/events"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { type Event as EventSchema } from "@/server/db/schema"
import { type User } from "@/server/db/schema"
import { type UserBalance } from "@/server/services/campaigns/get-balance-overview"
import { type CampaignEventsOverview } from "@/server/services/campaigns/get-events-overview"

import { formatCentsToCurrency } from "./money"
import { getUserDisplayName } from "./users"

type Event = Pick<EventSchema, "id" | "name" | "goalType" | "casesGoal">

export function getCurrentEventLevel({
  casesPaid,
  casesCheckedOut,
  events,
}: {
  casesPaid: number
  casesCheckedOut: number
  events: Event[]
}) {
  let currentEvent: Event | null = null

  const eventsByType: Record<EventGoalTypeEnum, Event[]> = events.reduce(
    (acc, event) => {
      if (!acc[event.goalType as EventGoalTypeEnum]) {
        acc[event.goalType as EventGoalTypeEnum] = []
      }

      acc[event.goalType as EventGoalTypeEnum].push(event)

      return acc
    },
    {} as Record<EventGoalTypeEnum, Event[]>
  )

  const allParticipantsEvents = eventsByType[EventGoalTypeEnum.ALL_PARTICIPANTS] ?? []
  const firstCaseCheckoutEvents = eventsByType[EventGoalTypeEnum.FIRST_CASE_CHECKOUT] ?? []
  const firstPaymentEvents = eventsByType[EventGoalTypeEnum.FIRST_PAYMENT_TURNED_IN] ?? []
  const casePaymentEvents = eventsByType[EventGoalTypeEnum.CASE_PAYMENT] ?? []

  if (allParticipantsEvents.length > 0) {
    currentEvent = allParticipantsEvents[0] ?? null
  }

  if (firstCaseCheckoutEvents.length > 0 && casesCheckedOut > 0) {
    currentEvent = firstCaseCheckoutEvents[0] ?? null
  }

  if (firstPaymentEvents.length > 0 && casesPaid > 0) {
    currentEvent = firstPaymentEvents[0] ?? null
  }

  if (casePaymentEvents.length > 0 && casesPaid > 0) {
    const casePaymentEventsSorted = casePaymentEvents.sort((a, b) => (b.casesGoal ?? 0) - (a.casesGoal ?? 0))

    for (const event of casePaymentEventsSorted) {
      if (casesPaid >= (event.casesGoal ?? 0)) {
        currentEvent = event ?? null
        break
      }
    }
  }

  return currentEvent
}

export function getNextEventLevel({
  casesPaid,
  casesCheckedOut,
  events,
}: {
  casesPaid: number
  casesCheckedOut: number
  events: Event[]
}) {
  let nextEvent = null

  const firstCaseCheckoutEvents = events.filter(
    event => (event.goalType as EventGoalTypeEnum) === EventGoalTypeEnum.FIRST_CASE_CHECKOUT
  )
  const firstPaymentEvents = events.filter(
    event => (event.goalType as EventGoalTypeEnum) === EventGoalTypeEnum.FIRST_PAYMENT_TURNED_IN
  )
  const casePaymentEvents = events.filter(
    event => (event.goalType as EventGoalTypeEnum) === EventGoalTypeEnum.CASE_PAYMENT
  )

  if (casePaymentEvents.length > 0 && casesPaid === 0) {
    const casePaymentEventsSorted = casePaymentEvents.sort((a, b) => (a.casesGoal ?? 0) - (b.casesGoal ?? 0))

    nextEvent = casePaymentEventsSorted[0] ?? null
  }

  if (firstPaymentEvents.length > 0 && casesPaid === 0) {
    nextEvent = firstPaymentEvents[0] ?? null
  }

  if (firstCaseCheckoutEvents.length > 0 && casesCheckedOut === 0) {
    nextEvent = firstCaseCheckoutEvents[0] ?? null
  }

  return nextEvent ?? null
}

export interface EventReportRow {
  grade: string
  teacher: string
  pin: string
  participant: string
  eventLevel: string
  casesCheckedOut: number
  amountDue: string
  amountPaid: string
  amountUnpaid: string
}

export function getEventsReport({ eventsOverview }: { eventsOverview: CampaignEventsOverview }) {
  const data: EventReportRow[] = Object.entries(eventsOverview.usersBalanceById)
    .map(([userId, userData]) => {
      const user = eventsOverview.usersById[userId]
      if (!user) return null

      const currentEvent = getCurrentEventLevel({
        casesPaid: userData.casesPaid,
        casesCheckedOut: userData.casesCheckedOut,
        events: Object.values(eventsOverview.eventsInfoById),
      })
      if (!currentEvent) return null

      return getUserReportRow({ user, userData, event: currentEvent })
    })
    .filter(Boolean) as EventReportRow[]

  return sortEventReport({ data })
}

export function getEventReport({
  eventId,
  eventsOverview,
}: {
  eventId: string
  eventsOverview: CampaignEventsOverview
}) {
  const event = eventsOverview.eventsInfoById[eventId]
  if (!event) return { eligible: [], unpaid: [] }

  const eligibleData: EventReportRow[] = eventsOverview?.eventsInfoById[event.id]?.participants.eligible
    .map(user => {
      if (!user) return null

      const userData = eventsOverview.usersBalanceById[user.id]
      if (!userData) return null

      return getUserReportRow({ user, userData, event })
    })
    .filter(Boolean) as EventReportRow[]

  const unpaidData: EventReportRow[] = eventsOverview?.eventsInfoById[event.id]?.participants.unpaid
    .map(user => {
      if (!user) return null

      const userData = eventsOverview.usersBalanceById[user.id]
      if (!userData) return null

      return getUserReportRow({ user, userData, event })
    })
    .filter(Boolean) as EventReportRow[]

  return {
    eligible: sortEventReport({ data: eligibleData }),
    unpaid: sortEventReport({ data: unpaidData }),
  }
}

export function sortEventReport({ data }: { data: EventReportRow[] }): EventReportRow[] {
  return data.sort((a, b) => {
    // Compare grade
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade)

    // Compare teacher
    if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher)

    // Compare cases checked out (casesGoal equivalent)
    return b.casesCheckedOut - a.casesCheckedOut
  })
}

export interface EventReportRowForExport {
  [column: string]: string | number
  PIN: string
  Participant: string
  "Event Level": string
  "# of Cases Checked Out": string | number
  "Due ($)": string
  "Collected ($)": string
  "Unpaid ($)": string
}

export function formatEventReportForExport({ data }: { data: EventReportRow[] }): EventReportRowForExport[] {
  if (data.length === 0)
    return [
      {
        [GRADE_LABEL]: "",
        [TEACHER_LABEL]: "",
        PIN: "",
        Participant: "",
        "Event Level": "",
        "# of Cases Checked Out": "",
        "Due ($)": "",
        "Collected ($)": "",
        "Unpaid ($)": "",
      },
    ]

  return data.map(row => ({
    [GRADE_LABEL]: row.grade,
    [TEACHER_LABEL]: row.teacher,
    PIN: row.pin,
    Participant: row.participant,
    "Event Level": row.eventLevel,
    "# of Cases Checked Out": row.casesCheckedOut,
    "Due ($)": row.amountDue,
    "Collected ($)": row.amountPaid,
    "Unpaid ($)": row.amountUnpaid,
  }))
}

interface GetUserReportRowProps {
  user: User
  userData: UserBalance
  event?: Event | null
}

function getUserReportRow({ user, userData, event }: GetUserReportRowProps): EventReportRow {
  return {
    grade: user.grade ?? "-",
    teacher: user.teacherName ?? "-",
    pin: user.pin ?? "-",
    participant: getUserDisplayName(user),
    eventLevel: event?.name ?? "-",
    casesCheckedOut: userData.casesCheckedOut,
    amountDue: formatCentsToCurrency(userData.amountDueCents),
    amountPaid: formatCentsToCurrency(userData.amountPaidCents),
    amountUnpaid: formatCentsToCurrency(userData.amountDueCents - userData.amountPaidCents),
  }
}
