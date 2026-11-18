import { formatInTimeZone } from "date-fns-tz"
import { and, eq, gte, lte, ne } from "drizzle-orm"

import { CASES_TRANSACTIONS_TYPE_DETAILS, CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type User, casesTransactions } from "@/server/db/schema"
import { getCaseName } from "@/utils/cases-transactions"
import { getUserDisplayName, maskParticipantUserPii } from "@/utils/users"

export const casesTransactionsDownloadReportByCampaignId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: { campaignId: string; startDate?: Date; endDate?: Date; timezone?: string }
  maskParticipantPii?: boolean
}) => {
  const { campaignId, startDate, endDate } = input
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const casesTransactionsData = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, campaignId),
      // Inventory adjustments are left out of the report when the feature flag is off
      isInventoryUpdatesEnabled
        ? undefined
        : ne(casesTransactions.type, CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT),
      startDate ? gte(casesTransactions.createdAt, startDate) : undefined,
      endDate ? lte(casesTransactions.createdAt, endDate) : undefined
    ),
    columns: {
      quantity: true,
      createdAt: true,
      userId: true,
      type: true,
      pricePerBarCents: true,
      barsPerCase: true,
      costPerCaseCents: true,
      note: true,
    },
    with: {
      user: {
        columns: {
          grade: true,
          teacherName: true,
          pin: true,
          firstName: true,
          fullName: true,
        },
      },
      createdByUser: {
        columns: {
          fullName: true,
          email: true,
        },
      },
    },
  })

  const data = Object.values(casesTransactionsData).map(transaction => {
    const u = transaction.user as User | undefined
    const participantUser = u && maskParticipantPii ? maskParticipantUserPii(u) : u
    const typeDetails = CASES_TRANSACTIONS_TYPE_DETAILS[transaction.type as CasesTransactionsTypeEnum]
    const caseName = getCaseName({
      pricePerBarCents: transaction.pricePerBarCents ?? 0,
      barsPerCase: transaction.barsPerCase ?? 60,
    })
    const isFree = transaction.costPerCaseCents === 0 && transaction.type === CasesTransactionsTypeEnum.DELIVERED
    const isAdjustment = transaction.type === CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT

    const createdBy = transaction.createdByUser
      ? `${transaction.createdByUser.fullName ?? "-"} (${transaction.createdByUser.email ?? "-"})`
      : "-"

    return {
      grade: transaction.user?.grade ?? "-",
      teacher: transaction.user?.teacherName ?? "-",
      pin: transaction.user?.pin ?? "-",
      participant: getUserDisplayName(participantUser ?? undefined, "Unknown"),
      casesCheckedOut: isAdjustment ? -transaction.quantity : transaction.quantity,
      date: formatInTimeZone(transaction.createdAt, input.timezone ?? "UTC", "MM/dd/yyyy h:mma"),
      type: typeDetails?.label ?? "-",
      caseDetails: `${caseName}${isFree ? " (Free)" : ""}`,
      note: transaction.note ?? "-",
      createdBy,
    }
  })

  const sortedData = data.sort((a, b) => {
    // Compare grade
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade)

    // Compare teacher
    if (a.teacher !== b.teacher) return a.teacher.localeCompare(b.teacher)

    // Compare participant
    if (a.participant !== b.participant) return a.participant.localeCompare(b.participant)

    // Compare cases checked out
    return b.casesCheckedOut - a.casesCheckedOut
  })

  const reportData = sortedData.map(row => ({
    [GRADE_LABEL]: row.grade,
    [TEACHER_LABEL]: row.teacher,
    PIN: row.pin,
    Participant: row.participant,
    "# of Cases": row.casesCheckedOut,
    Date: row.date,
    Type: row.type,
    "Case Details": row.caseDetails,
    ...(isInventoryUpdatesEnabled ? { Note: row.note } : {}),
    "Created By": row.createdBy,
  }))

  if (reportData.length === 0)
    return [
      {
        [GRADE_LABEL]: "",
        [TEACHER_LABEL]: "",
        PIN: "",
        Participant: "",
        "# of Cases": "",
        Date: "",
        Type: "",
        "Case Details": "",
        ...(isInventoryUpdatesEnabled ? { Note: "" } : {}),
        "Created By": "",
      },
    ]

  return reportData
}
