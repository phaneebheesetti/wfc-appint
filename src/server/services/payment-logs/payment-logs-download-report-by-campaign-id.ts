import { formatInTimeZone } from "date-fns-tz"
import { and, eq, ilike, inArray, isNull } from "drizzle-orm"

import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import {
  PAYMENT_LOGS_STATUS_LABEL,
  PAYMENT_LOGS_TYPE_DETAILS,
  PaymentLogsStatusEnum,
  PaymentLogsTypeEnum,
} from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { type User, paymentLogs, users } from "@/server/db/schema"
import { formatCentsToCurrency } from "@/utils/money"
import { getUserDisplayName, maskParticipantUserPii } from "@/utils/users"

export const paymentLogsDownloadReportByCampaignId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: {
    campaignId: string
    timezone?: string
    type?: string[]
    participantSearch?: string
  }
  maskParticipantPii?: boolean
}) => {
  const { campaignId, type, participantSearch } = input

  let filteredUserIds: string[] | undefined = undefined

  if (participantSearch) {
    const matchingUsers = await database.query.users.findMany({
      where: ilike(users.fullName, `%${participantSearch}%`),
      columns: {
        id: true,
      },
    })

    filteredUserIds = matchingUsers.map(user => user.id)

    if (filteredUserIds.length === 0) {
      return [
        {
          [GRADE_LABEL]: "",
          [TEACHER_LABEL]: "",
          Date: "",
          Type: "",
          PIN: "",
          Participant: "",
          Amount: "",
          Status: "",
          "Created By": "",
        },
      ]
    }
  }

  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, campaignId),
      inArray(paymentLogs.status, [PaymentLogsStatusEnum.COMPLETED, PaymentLogsStatusEnum.PENDING]),
      isNull(paymentLogs.deletedAt),
      type?.length ? inArray(paymentLogs.type, type as PaymentLogsTypeEnum[]) : undefined,
      filteredUserIds ? inArray(paymentLogs.userId, filteredUserIds) : undefined
    ),
    with: {
      user: true,
      createdByUser: {
        columns: {
          fullName: true,
          email: true,
        },
      },
    },
  })

  const data = paymentLogsData.map(paymentLog => {
    const u = paymentLog.user as User | undefined
    const participantUser = u && maskParticipantPii ? maskParticipantUserPii(u) : u

    const creator = paymentLog.createdByUser as User | undefined
    const isCash = paymentLog.type === PaymentLogsTypeEnum.CASH
    const createdByUser = creator && maskParticipantPii && !isCash ? maskParticipantUserPii(creator) : creator

    const createdBy = createdByUser ? `${createdByUser.fullName ?? "-"} (${createdByUser.email ?? "-"})` : "-"

    return {
      createdAt: paymentLog.createdAt,
      grade: u?.grade ?? "-",
      teacher: u?.teacherName ?? "-",
      date: formatInTimeZone(paymentLog.createdAt, input.timezone ?? "UTC", "MM/dd/yyyy h:mma"),
      type: PAYMENT_LOGS_TYPE_DETAILS[paymentLog.type as PaymentLogsTypeEnum]?.label ?? "-",
      pin: u?.pin ?? "-",
      participant: getUserDisplayName(participantUser ?? undefined, "Unknown"),
      amount: formatCentsToCurrency(paymentLog.amountCents ?? 0),
      status: PAYMENT_LOGS_STATUS_LABEL[paymentLog.status as PaymentLogsStatusEnum] ?? "-",
      createdBy,
    }
  })

  const sortedData = data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const reportData = sortedData.map(row => ({
    [GRADE_LABEL]: row.grade,
    [TEACHER_LABEL]: row.teacher,
    Date: row.date,
    Type: row.type,
    PIN: row.pin,
    Participant: row.participant,
    Amount: row.amount,
    Status: row.status,
    "Created By": row.createdBy,
  }))

  if (reportData.length === 0)
    return [
      {
        [GRADE_LABEL]: "",
        [TEACHER_LABEL]: "",
        Date: "",
        Type: "",
        PIN: "",
        Participant: "",
        Amount: "",
        Status: "",
        "Created By": "",
      },
    ]

  return reportData
}
