import { and, eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

export const campaignsGetLeaderboards = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const casesTransactionsResult = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    with: {
      user: true,
    },
  })

  const leaderboardByGrade: Record<string, number> = {}
  const leaderboardByParticipant: Record<string, number> = {}
  const leaderboardByTeacher: Record<string, number> = {}

  casesTransactionsResult.forEach(caseTransaction => {
    if (!caseTransaction.user) return

    const user = caseTransaction.user

    if (user?.grade) {
      const gradeKey = user.grade
      leaderboardByGrade[gradeKey] = (leaderboardByGrade[gradeKey] ?? 0) + caseTransaction.quantity
    }

    if (user?.fullName) {
      const participantKey = `${user.fullName}=${user.grade}=${user.id}`
      leaderboardByParticipant[participantKey] =
        (leaderboardByParticipant[participantKey] ?? 0) + caseTransaction.quantity
    }

    if (user?.teacherName) {
      const teacherKey = `${user.teacherName}=${user.grade}`
      leaderboardByTeacher[teacherKey] = (leaderboardByTeacher[teacherKey] ?? 0) + caseTransaction.quantity
    }
  })

  const sortedLeaderboardByGrade = new Map(
    Object.entries(leaderboardByGrade)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
  )

  const sortedLeaderboardByParticipant = new Map(
    Object.entries(leaderboardByParticipant)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
  )

  const sortedLeaderboardByTeacher = new Map(
    Object.entries(leaderboardByTeacher)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
  )

  return {
    leaderboardByGrade: sortedLeaderboardByGrade,
    leaderboardByParticipant: sortedLeaderboardByParticipant,
    leaderboardByTeacher: sortedLeaderboardByTeacher,
  }
}
