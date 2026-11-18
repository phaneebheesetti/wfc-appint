import { and, eq, inArray } from "drizzle-orm"

import { DocumentsTypeEnum } from "@/constants/documents"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { campaigns, campaignsUsers, documents, organizationsUsers, participantParentUsers } from "@/server/db/schema"
import { campaignsGetBalanceOverview } from "@/server/services/campaigns/get-balance-overview"
import { formatCentsToCurrency } from "@/utils/money"
import { firstLetterUpperCase } from "@/utils/string"
import { getUserDisplayName, maskParticipantUserPii } from "@/utils/users"

export const campaignsUsersDownloadReportByCampaignId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: { campaignId: string }
  maskParticipantPii?: boolean
}) => {
  //fetch campaign
  const campaign = await database.query.campaigns.findFirst({
    where: eq(campaigns.id, input.campaignId),
  })

  if (!campaign) {
    return []
  }

  const { usersById, usersBalanceById } = await campaignsGetBalanceOverview({
    database,
    input: { campaignId: input.campaignId },
  })

  const userIds = Object.keys(usersById)

  if (userIds.length === 0) {
    return []
  }

  //fetch campaignsUsers data
  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: and(eq(campaignsUsers.campaignId, input.campaignId), inArray(campaignsUsers.userId, userIds)),
    with: {
      user: {
        with: {
          parentUser: true,
        },
      },
    },
  })

  const parentMappings = await database.query.participantParentUsers.findMany({
    where: inArray(participantParentUsers.participantUserId, userIds),
    with: {
      parentUser: true,
    },
  })

  const parentMappingsByUserId = parentMappings.reduce(
    (acc, mapping) => {
      const key = mapping.participantUserId
      acc[key] = [...(acc[key] ?? []), mapping]
      return acc
    },
    {} as Record<string, (typeof parentMappings)[number][]>
  )

  //fetch eligible status from organizationsUsers
  const organizationUsersData = await database.query.organizationsUsers.findMany({
    where: and(
      inArray(organizationsUsers.userId, userIds),
      eq(organizationsUsers.organizationId, campaign.organizationId)
    ),
  })

  //lookup map
  const campaignUsersByUserId = campaignsUsersData.reduce(
    (acc, campaignusers) => {
      acc[campaignusers.userId] = campaignusers
      return acc
    },
    {} as Record<string, (typeof campaignsUsersData)[number]>
  )

  const eligibleByUserId = organizationUsersData.reduce(
    (acc, orgusers) => {
      acc[orgusers.userId] = !!orgusers.eligible
      return acc
    },
    {} as Record<string, boolean>
  )

  const documentsData = await database.query.documents.findMany({
    where: eq(documents.campaignId, input.campaignId),
    with: {
      documentsUsers: true,
    },
  })

  const permissionSlip = documentsData.find(doc => doc.type === DocumentsTypeEnum.PERMISSION_SLIP)

  const permissionSlipUserIds = permissionSlip?.documentsUsers?.filter(du => du.sentEmailAt)?.map(du => du.userId) ?? []

  const data = Object.values(usersBalanceById)
    .map(userBalance => {
      const user = usersById[userBalance.userId]
      if (!user) return null

      const campaignUser = campaignUsersByUserId[userBalance.userId]
      const mappings = parentMappingsByUserId[userBalance.userId] ?? []

      const participantUser = maskParticipantPii ? maskParticipantUserPii(user) : user

      const statuses: string[] = []

      if (campaignUser?.user?.parentUser?.status) {
        statuses.push(campaignUser.user.parentUser.status)
      }

      for (const mapping of mappings) {
        if (mapping.parentUser?.status) {
          statuses.push(mapping.parentUser.status)
        }
      }

      let parentStatus = "-"

      if (statuses.length > 0) {
        const priority: Record<string, number> = {
          [UsersStatusEnum.ACTIVE]: 0,
          [UsersStatusEnum.PENDING]: 1,
          [UsersStatusEnum.INACTIVE]: 2,
          [UsersStatusEnum.DELETED]: 3,
        }

        const best = statuses.reduce((best, current) =>
          (priority[current] ?? 99) < (priority[best] ?? 99) ? current : best
        )

        parentStatus = firstLetterUpperCase(best)
      }

      let permissionStatus = "Not Sent"
      const isSigned = !!campaignUser?.permissionSlipSignedAt
      const isSent = permissionSlipUserIds.includes(userBalance.userId)

      if (isSigned) {
        permissionStatus = "Signed"
      } else if (isSent) {
        permissionStatus = "Sent"
      }

      return {
        grade: user.grade ?? "-",
        teacher: user.teacherName ?? "-",
        participant: getUserDisplayName(participantUser),
        casesCheckedOut: userBalance.casesCheckedOut,
        amountDue: formatCentsToCurrency(userBalance.amountDueCents),
        amountPaid: formatCentsToCurrency(userBalance.amountPaidCents),
        amountUnpaid: formatCentsToCurrency(userBalance.amountDueCents - userBalance.amountPaidCents),
        parent: parentStatus,
        pin: user.pin ?? "-",
        permissionSigned: permissionStatus,
        eligible: eligibleByUserId[userBalance.userId] ? "Yes" : "No",
      }
    })
    .filter(row => row !== null)

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
    Participant: row.participant,
    "# of Cases Checked Out": row.casesCheckedOut,
    "Due ($)": row.amountDue,
    "Collected ($)": row.amountPaid,
    "Unpaid ($)": row.amountUnpaid,
    Parent: row.parent,
    PIN: row.pin,
    "Permission Signed": row.permissionSigned,
    Eligible: row.eligible,
  }))

  if (reportData.length === 0)
    return [
      {
        [GRADE_LABEL]: "",
        [TEACHER_LABEL]: "",
        Participant: "",
        "# of Cases Checked Out": "",
        "Due ($)": "",
        "Collected ($)": "",
        "Unpaid ($)": "",
        Parent: "",
        PIN: "",
        "Permission Signed": "",
        Eligible: "",
      },
    ]

  return reportData
}
