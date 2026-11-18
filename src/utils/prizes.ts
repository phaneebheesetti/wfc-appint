import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { PrizeGoalTypeEnum } from "@/constants/prize"
import { type Prize as PrizeSchema } from "@/server/db/schema"
import { type User } from "@/server/db/schema"
import { type UserBalance } from "@/server/services/campaigns/get-balance-overview"
import { type CampaignPrizesOverview, type PrizeInfo } from "@/server/services/campaigns/get-prizes-overview"

import { formatCentsToCurrency } from "./money"
import { getUserDisplayName, maskParticipantUserPii } from "./users"

type Prize = Pick<PrizeSchema, "id" | "name" | "goalType" | "casesGoal" | "nextPrizeId">

export function getCurrentPrizeLevel({
  casesPaid,
  casesCheckedOut,
  prizes,
}: {
  casesPaid: number
  casesCheckedOut: number
  prizes: Prize[]
}) {
  let currentPrize: Prize | null = null

  const prizesByType: Record<PrizeGoalTypeEnum, Prize[]> = prizes.reduce(
    (acc, prize) => {
      if (!acc[prize.goalType as PrizeGoalTypeEnum]) {
        acc[prize.goalType as PrizeGoalTypeEnum] = []
      }

      acc[prize.goalType as PrizeGoalTypeEnum].push(prize)

      return acc
    },
    {} as Record<PrizeGoalTypeEnum, Prize[]>
  )

  const allParticipantsPrizes = prizesByType[PrizeGoalTypeEnum.ALL_PARTICIPANTS] ?? []
  const firstCaseCheckoutPrizes = prizesByType[PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT] ?? []
  const firstPaymentPrizes = prizesByType[PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN] ?? []
  const casePaymentPrizes = prizesByType[PrizeGoalTypeEnum.CASE_PAYMENT] ?? []

  if (allParticipantsPrizes.length > 0) {
    currentPrize = allParticipantsPrizes[0] ?? null
  }

  if (firstCaseCheckoutPrizes.length > 0 && casesCheckedOut > 0) {
    currentPrize = firstCaseCheckoutPrizes[0] ?? null
  }

  if (firstPaymentPrizes.length > 0 && casesPaid > 0) {
    currentPrize = firstPaymentPrizes[0] ?? null
  }

  if (casePaymentPrizes.length > 0 && casesPaid > 0) {
    const casePaymentPrizesSorted = casePaymentPrizes.sort((a, b) => (b.casesGoal ?? 0) - (a.casesGoal ?? 0))

    for (const prize of casePaymentPrizesSorted) {
      if (casesPaid >= (prize.casesGoal ?? 0)) {
        currentPrize = prize ?? null
        break
      }
    }
  }

  return currentPrize
}

export function getNextPrizeLevel({
  casesPaid,
  casesCheckedOut,
  prizes,
}: {
  casesPaid: number
  casesCheckedOut: number
  prizes: Prize[]
}) {
  const currentPrize = getCurrentPrizeLevel({
    casesPaid,
    casesCheckedOut,
    prizes,
  })

  let nextPrize = null

  if (currentPrize?.nextPrizeId) {
    nextPrize = prizes.find(prize => prize.id === currentPrize?.nextPrizeId)
  } else {
    const firstCaseCheckoutPrizes = prizes.filter(
      prize => (prize.goalType as PrizeGoalTypeEnum) === PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT
    )
    const firstPaymentPrizes = prizes.filter(
      prize => (prize.goalType as PrizeGoalTypeEnum) === PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN
    )
    const casePaymentPrizes = prizes.filter(
      prize => (prize.goalType as PrizeGoalTypeEnum) === PrizeGoalTypeEnum.CASE_PAYMENT
    )

    if (casePaymentPrizes.length > 0 && casesPaid === 0) {
      const casePaymentPrizesSorted = casePaymentPrizes.sort((a, b) => (a.casesGoal ?? 0) - (b.casesGoal ?? 0))

      nextPrize = casePaymentPrizesSorted[0] ?? null
    }

    if (firstPaymentPrizes.length > 0 && casesPaid === 0) {
      nextPrize = firstPaymentPrizes[0] ?? null
    }

    if (firstCaseCheckoutPrizes.length > 0 && casesCheckedOut === 0) {
      nextPrize = firstCaseCheckoutPrizes[0] ?? null
    }
  }

  return nextPrize ?? null
}

export interface PrizeReportRow {
  grade: string
  teacher: string
  pin: string
  participant: string
  prizeLevel: string
  casesCheckedOut: number
  amountDue: string
  amountPaid: string
  amountUnpaid: string
}

export function getPrizesReport({
  prizesOverview,
  maskParticipantPii = false,
}: {
  prizesOverview: CampaignPrizesOverview
  maskParticipantPii?: boolean
}) {
  const prizeReport: PrizeReportRow[] = []

  const prizesByType: Record<PrizeGoalTypeEnum, PrizeInfo[]> = Object.values(prizesOverview.prizesInfoById).reduce(
    (acc, prize) => {
      acc[prize.goalType] ??= []
      acc[prize.goalType].push(prize)

      return acc
    },
    {} as Record<PrizeGoalTypeEnum, PrizeInfo[]>
  )

  const orderedPrizesByType: PrizeInfo[] = [
    ...(prizesByType[PrizeGoalTypeEnum.ALL_PARTICIPANTS] ?? []),
    ...(prizesByType[PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT] ?? []),
    ...(prizesByType[PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN] ?? []),
    ...(prizesByType[PrizeGoalTypeEnum.CASE_PAYMENT] ?? []).sort((a, b) => a.casesGoal - b.casesGoal),
  ]

  Object.entries(prizesOverview.usersBalanceById).forEach(([userId, userData]) => {
    const user = prizesOverview.usersById[userId]
    if (!user) return

    const earnedPrizes = orderedPrizesByType.filter(prize => prize.participants.eligibleIds.includes(userId))

    earnedPrizes.forEach(prize => {
      prizeReport.push(getUserReportRow({ user, userData, prize, maskParticipantPii }))
    })
  })

  return sortPrizeReport({ data: prizeReport.filter(Boolean) as PrizeReportRow[] })
}

export function getPrizeReport({
  prizeId,
  prizesOverview,
}: {
  prizeId: string
  prizesOverview: CampaignPrizesOverview
}) {
  const prize = prizesOverview.prizesInfoById[prizeId]
  if (!prize) return { eligible: [], unpaid: [] }

  const eligibleData: PrizeReportRow[] = prizesOverview?.prizesInfoById[prize.id]?.participants.eligible
    .map(user => {
      if (!user) return null

      const userData = prizesOverview.usersBalanceById[user.id]
      if (!userData) return null

      return getUserReportRow({ user, userData, prize })
    })
    .filter(Boolean) as PrizeReportRow[]

  const unpaidData: PrizeReportRow[] = prizesOverview?.prizesInfoById[prize.id]?.participants.unpaid
    .map(user => {
      if (!user) return null

      const userData = prizesOverview.usersBalanceById[user.id]
      if (!userData) return null

      return getUserReportRow({ user, userData, prize })
    })
    .filter(Boolean) as PrizeReportRow[]

  return {
    eligible: sortPrizeReport({ data: eligibleData }),
    unpaid: sortPrizeReport({ data: unpaidData }),
  }
}

export function sortPrizeReport({ data }: { data: PrizeReportRow[] }): PrizeReportRow[] {
  return data.sort((a, b) => {
    // Compare grade
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade)

    // Compare teacher
    if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher)

    // Compare cases checked out (casesGoal equivalent)
    return b.casesCheckedOut - a.casesCheckedOut
  })
}

export interface PrizeReportRowForExport {
  [column: string]: string | number
  PIN: string
  Participant: string
  Prize: string
  "# of Cases Checked Out": string | number
  "Due ($)": string
  "Collected ($)": string
  "Unpaid ($)": string
}

export function formatPrizeReportForExport({ data }: { data: PrizeReportRow[] }): PrizeReportRowForExport[] {
  if (data.length === 0)
    return [
      {
        [GRADE_LABEL]: "",
        [TEACHER_LABEL]: "",
        PIN: "",
        Participant: "",
        Prize: "",
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
    Prize: row.prizeLevel,
    "# of Cases Checked Out": row.casesCheckedOut,
    "Due ($)": row.amountDue,
    "Collected ($)": row.amountPaid,
    "Unpaid ($)": row.amountUnpaid,
  }))
}

interface GetUserReportRowProps {
  user: User
  userData: UserBalance
  prize?: Prize | null
  maskParticipantPii?: boolean
}

function getUserReportRow({
  user,
  userData,
  prize,
  maskParticipantPii = false,
}: GetUserReportRowProps): PrizeReportRow {
  const participantUser = maskParticipantPii ? maskParticipantUserPii(user) : user

  return {
    grade: user.grade ?? "-",
    teacher: user.teacherName ?? "-",
    pin: user.pin ?? "-",
    participant: getUserDisplayName(participantUser),
    prizeLevel: prize?.name ?? "-",
    casesCheckedOut: userData.casesCheckedOut,
    amountDue: formatCentsToCurrency(userData.amountDueCents),
    amountPaid: formatCentsToCurrency(userData.amountPaidCents),
    amountUnpaid: formatCentsToCurrency(userData.amountDueCents - userData.amountPaidCents),
  }
}
