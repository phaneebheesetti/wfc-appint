import { and, desc, eq, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { type OrganizationUser, organizations, organizationsUsers, users } from "@/server/db/schema"

export const organizationsUsersGetAllParticipants = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string }
}) => {
  const parentUsers = alias(users, "parentUsers")

  const organizationUsersResult = await database
    .select()
    .from(organizationsUsers)
    .innerJoin(organizations, eq(organizationsUsers.organizationId, organizations.id))
    .innerJoin(users, eq(organizationsUsers.userId, users.id))
    .leftJoin(parentUsers, eq(users.parentUserId, parentUsers.id))
    .where(and(eq(organizations.id, input.organizationId), inArray(users.role, [RolesEnum.PARTICIPANT])))
    .orderBy(desc(organizationsUsers.createdAt))

  const organizationUsersData: OrganizationUser[] = await Promise.all(
    organizationUsersResult.map(async organizationUser => ({
      ...organizationUser.organizations_users,
      user: {
        ...organizationUser.users,
        parentUser: organizationUser.parentUsers
          ? {
              ...organizationUser.parentUsers,
            }
          : undefined,
      },
    }))
  )

  return organizationUsersData
}
