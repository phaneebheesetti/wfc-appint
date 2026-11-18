import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { EventGoalTypeEnum } from "@/constants/events"
import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { PrizeGoalTypeEnum } from "@/constants/prize"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions, events, paymentLogs, prizes } from "@/server/db/schema"

export const campaignsGetParticipantsByEvent = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const campaignCasesTransactions = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    with: {
      user: true,
    },
  })

  const campaignParticipants = await database.query.campaignsUsers.findMany({
    where: eq(campaignsUsers.campaignId, input.campaignId),
  })

  const campaignPaymentLogs = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
  })

  const campaignEvents = await database.query.events.findMany({
    where: eq(events.campaignId, input.campaignId),
  })

  const campaignPrizes = await database.query.prizes.findMany({
    where: eq(prizes.campaignId, input.campaignId),
  })

  const eventTiers: Record<
    string,
    {
      id: string
      name: string
      eligibleParticipants: number
      casesCheckout: number
      casesPaid: number
      firstPayment: boolean
      firstCaseCheckout: boolean
      allParticipants: boolean
      prizeQualification: boolean
      prizeId: string | null
      participantIds: string[]
    }
  > = {}

  for (const event of campaignEvents) {
    const firstPayment = event.goalType === String(EventGoalTypeEnum.FIRST_PAYMENT_TURNED_IN)
    const firstCaseCheckout = event.goalType === String(EventGoalTypeEnum.FIRST_CASE_CHECKOUT)
    const allParticipants = event.goalType === String(EventGoalTypeEnum.ALL_PARTICIPANTS)
    const prizeQualification = event.goalType === String(EventGoalTypeEnum.PRIZE_QUALIFICATION)

    let casesPaid = 0
    if (event.goalType === String(EventGoalTypeEnum.CASE_PAYMENT)) {
      casesPaid = event.casesGoal ?? 0
    }

    eventTiers[event.id] = {
      name: event.name,
      eligibleParticipants: 0,
      casesCheckout: 0,
      casesPaid,
      firstPayment,
      firstCaseCheckout,
      allParticipants,
      prizeQualification,
      prizeId: event.prizeId,
      id: event.id,
      participantIds: [],
    }
  }

  const prizeTiers: Record<
    string,
    {
      id: string
      name: string
      casesCheckout: number
      casesPaid: number
      firstPayment: boolean
      firstCaseCheckout: boolean
      allParticipants: boolean
      prizeQualification: boolean
      prizeId: string | null
      participantIds: string[]
    }
  > = {}

  for (const prize of campaignPrizes) {
    const firstPayment = prize.goalType === String(PrizeGoalTypeEnum.FIRST_PAYMENT_TURNED_IN)
    const firstCaseCheckout = prize.goalType === String(PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT)
    const allParticipants = prize.goalType === String(PrizeGoalTypeEnum.ALL_PARTICIPANTS)

    let casesPaid = 0
    let casesCheckout = 0
    if (prize.goalType === String(PrizeGoalTypeEnum.CASE_PAYMENT)) {
      casesPaid = prize.casesGoal ?? 0
      casesCheckout = prize.casesGoal ?? 0
    }

    prizeTiers[prize.id] = {
      name: prize.name,
      casesCheckout,
      casesPaid,
      firstPayment,
      firstCaseCheckout,
      allParticipants,
      id: prize.id,
      prizeQualification: false,
      prizeId: null,
      participantIds: [],
    }
  }

  const usersBalance: Record<
    string,
    {
      casesCheckedOut: number
      casesPaid: number
      amountPaidCents: number
      totalAmountDueCents: number
      transactions: Array<{ quantity: number; pricePerCaseCents: number }>
      isEligibleForAnyPrize: boolean
      eligiblePrizeIds: Set<string>
    }
  > = {}

  for (const participant of campaignParticipants) {
    usersBalance[participant.userId] ??= {
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      totalAmountDueCents: 0,
      transactions: [],
      isEligibleForAnyPrize: false,
      eligiblePrizeIds: new Set<string>(),
    }
  }

  for (const transaction of campaignCasesTransactions) {
    if (!transaction.userId) continue

    usersBalance[transaction.userId] ??= {
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      totalAmountDueCents: 0,
      transactions: [],
      isEligibleForAnyPrize: false,
      eligiblePrizeIds: new Set<string>(),
    }

    usersBalance[transaction.userId]!.casesCheckedOut += transaction.quantity

    const pricePerCaseCents =
      transaction.quantity > 0 && transaction.totalPriceCents
        ? Math.round(transaction.totalPriceCents / transaction.quantity)
        : 0

    usersBalance[transaction.userId]!.transactions.push({
      quantity: transaction.quantity,
      pricePerCaseCents,
    })

    usersBalance[transaction.userId]!.totalAmountDueCents += transaction.totalPriceCents ?? 0
  }

  for (const payment of campaignPaymentLogs) {
    if (!payment.userId || !payment.amountCents) continue

    usersBalance[payment.userId] ??= {
      casesCheckedOut: 0,
      casesPaid: 0,
      amountPaidCents: 0,
      totalAmountDueCents: 0,
      transactions: [],
      isEligibleForAnyPrize: false,
      eligiblePrizeIds: new Set<string>(),
    }

    usersBalance[payment.userId]!.amountPaidCents += payment.amountCents
  }

  Object.values(usersBalance).forEach(userData => {
    if (userData.totalAmountDueCents > 0 && userData.amountPaidCents > 0) {
      userData.transactions.sort((a, b) => a.pricePerCaseCents - b.pricePerCaseCents)

      let remainingPaymentCents = userData.amountPaidCents
      let casesPaid = 0

      for (const tx of userData.transactions) {
        if (remainingPaymentCents <= 0) break

        if (tx.pricePerCaseCents <= 0) continue

        const casesPayableFromTx = Math.min(tx.quantity, remainingPaymentCents / tx.pricePerCaseCents)

        casesPaid += casesPayableFromTx

        remainingPaymentCents -= casesPayableFromTx * tx.pricePerCaseCents
      }

      userData.casesPaid = casesPaid
    }
  })

  Object.entries(usersBalance).forEach(([_userId, userData]) => {
    Object.entries(prizeTiers).forEach(([prizeId, prize]) => {
      let isEligible = false

      if (prize.allParticipants) {
        isEligible = true
      }

      if (prize.firstPayment && userData.amountPaidCents > 0) {
        isEligible = true
      }

      if (prize.firstCaseCheckout && userData.casesCheckedOut > 0) {
        isEligible = true
      }

      if (prize.casesPaid > 0 && userData.casesPaid >= prize.casesPaid) {
        isEligible = true
      }

      if (prize.casesCheckout > 0 && userData.casesCheckedOut >= prize.casesCheckout) {
        isEligible = true
      }

      if (prize.prizeQualification) {
        if (prize.prizeId) {
          isEligible = userData.eligiblePrizeIds.has(prize.prizeId)
        } else {
          isEligible = userData.isEligibleForAnyPrize
        }
      }

      if (isEligible) {
        if (eventTiers[prizeId]) {
          eventTiers[prizeId].eligibleParticipants++
          eventTiers[prizeId].participantIds.push(_userId)
        }
      }
    })
  })

  const cleanUserCases = Object.entries(usersBalance).reduce(
    (acc, [userId, data]) => {
      acc[userId] = {
        casesCheckedOut: data.casesCheckedOut,
        casesPaid: data.casesPaid,
        amountPaidCents: data.amountPaidCents,
        totalAmountDueCents: data.totalAmountDueCents,
      }
      return acc
    },
    {} as Record<
      string,
      { casesCheckedOut: number; casesPaid: number; amountPaidCents: number; totalAmountDueCents: number }
    >
  )

  Object.entries(usersBalance).forEach(([_userId, userData]) => {
    Object.entries(eventTiers).forEach(([eventId, event]) => {
      let isEligible = false

      if (event.allParticipants) {
        isEligible = true
      }

      if (event.firstPayment && userData.amountPaidCents > 0) {
        isEligible = true
      }

      if (event.firstCaseCheckout && userData.casesCheckedOut > 0) {
        isEligible = true
      }

      if (event.casesPaid > 0 && userData.casesPaid >= event.casesPaid) {
        isEligible = true
      }

      if (event.casesCheckout > 0 && userData.casesCheckedOut >= event.casesCheckout) {
        isEligible = true
      }

      if (event.prizeQualification) {
        if (event.prizeId) {
          isEligible = userData.eligiblePrizeIds.has(event.prizeId)
        } else {
          isEligible = userData.isEligibleForAnyPrize
        }
      }

      if (isEligible) {
        if (eventTiers[eventId]) {
          eventTiers[eventId].eligibleParticipants++
          eventTiers[eventId].participantIds.push(_userId)
        }
      }
    })
  })

  const participantsByEventCategory: Record<string, number> = {}
  Object.entries(eventTiers).forEach(([_eventId, event]) => {
    participantsByEventCategory[event.id] = event.eligibleParticipants
  })

  const totalParticipants = Object.keys(cleanUserCases).length

  return {
    participantsByCategory: participantsByEventCategory,
    totalParticipants,
    usersBalance: cleanUserCases,
    eventTiers,
  }
}
