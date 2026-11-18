import { and, eq, ilike, isNotNull, isNull, not, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { UsersStatusEnum } from "@/constants/users"
import { campaignsUsers, organizationsUsers, participantParentUsers, users } from "@/server/db/schema"

export const parentUsersAlias = alias(users, "parentUsers")

export type CampaignsUsersFilterInput = {
  campaignId: string
  organizationId: string
  search?: string
  grade?: string
  teacherName?: string
  permissionSlipSigned?: boolean
  eligible?: boolean
  parentUserStatus?: UsersStatusEnum
}

export const organizationsUsersJoinCondition = (organizationId: string) =>
  and(eq(campaignsUsers.userId, organizationsUsers.userId), eq(organizationsUsers.organizationId, organizationId))

// Status priority: ACTIVE > PENDING > INACTIVE > DELETED.
const hasParentWithStatus = (status: UsersStatusEnum) =>
  sql`COALESCE(
    ${parentUsersAlias.status}::text = ${status}
    OR EXISTS (
      SELECT 1 FROM ${participantParentUsers} ppm
      INNER JOIN ${users} mp ON ppm.parent_user_id = mp.id
      WHERE ppm.participant_user_id = ${users.id}
        AND mp.status::text = ${status}
    ),
    FALSE
  )`

const hasParentWithEmailMatch = (search: string) =>
  sql`EXISTS (
    SELECT 1 FROM ${participantParentUsers} ppm
    INNER JOIN ${users} mp ON ppm.parent_user_id = mp.id
    WHERE ppm.participant_user_id = ${users.id}
      AND mp.email ILIKE ${`%${search}%`}
  )`

const buildBestStatusFilter = (status: UsersStatusEnum) => {
  if (status === UsersStatusEnum.ACTIVE) {
    return hasParentWithStatus(UsersStatusEnum.ACTIVE)
  }

  const higherPriorities: UsersStatusEnum[] = []
  if (status === UsersStatusEnum.PENDING) higherPriorities.push(UsersStatusEnum.ACTIVE)
  if (status === UsersStatusEnum.INACTIVE) higherPriorities.push(UsersStatusEnum.ACTIVE, UsersStatusEnum.PENDING)
  if (status === UsersStatusEnum.DELETED)
    higherPriorities.push(UsersStatusEnum.ACTIVE, UsersStatusEnum.PENDING, UsersStatusEnum.INACTIVE)

  return and(...higherPriorities.map(s => not(hasParentWithStatus(s))), hasParentWithStatus(status))
}

export const buildCampaignsUsersWhereClause = ({
  campaignId,
  organizationId,
  search = "",
  grade,
  teacherName,
  permissionSlipSigned,
  eligible,
  parentUserStatus,
}: CampaignsUsersFilterInput) =>
  and(
    eq(campaignsUsers.campaignId, campaignId),
    eq(campaignsUsers.organizationId, organizationId),
    search
      ? or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.pin, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(parentUsersAlias.email, `%${search}%`),
          hasParentWithEmailMatch(search)
        )
      : undefined,
    grade ? eq(users.grade, grade) : undefined,
    teacherName ? eq(users.teacherName, teacherName) : undefined,
    permissionSlipSigned === undefined
      ? undefined
      : permissionSlipSigned
        ? isNotNull(campaignsUsers.permissionSlipSignedAt)
        : isNull(campaignsUsers.permissionSlipSignedAt),
    eligible === undefined ? undefined : eq(organizationsUsers.eligible, eligible),
    parentUserStatus ? buildBestStatusFilter(parentUserStatus) : undefined
  )
