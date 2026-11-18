import { and, desc, eq, inArray, isNull, notInArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { type RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { type OrganizationUser, organizations, organizationsUsers, users } from "@/server/db/schema"

export const organizationsUsersGetAllMembers = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; roles: RolesEnum[]; activeOnly?: boolean }
}) => {
  const organizationUsersData = await database
    .select()
    .from(organizationsUsers)
    .innerJoin(organizations, eq(organizationsUsers.organizationId, organizations.id))
    .innerJoin(users, eq(organizationsUsers.userId, users.id))
    .leftJoin(alias(users, "invitedByUser"), eq(users.invitedByUserId, alias(users, "invitedByUser").id))
    .where(
      and(
        eq(organizations.id, input.organizationId),
        inArray(users.role, input.roles),
        input.activeOnly ? isNull(users.deletedAt) : undefined,
        input.activeOnly ? notInArray(users.status, [UsersStatusEnum.INACTIVE, UsersStatusEnum.DELETED]) : undefined
      )
    )
    .orderBy(desc(organizationsUsers.createdAt))

  const organizationUsers: OrganizationUser[] = organizationUsersData.map(organizationUser => ({
    ...organizationUser.organizations_users,
    user: {
      ...organizationUser.users,
    },
    invitedByUser: organizationUser.invitedByUser
      ? {
          ...organizationUser.invitedByUser,
        }
      : undefined,
  }))

  return organizationUsers
}
