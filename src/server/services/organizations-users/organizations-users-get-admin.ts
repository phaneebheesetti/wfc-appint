import { and, eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { organizations, organizationsUsers, users } from "@/server/db/schema"

export const organizationsUsersGetAdmin = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string }
}) => {
  const [organizationAdmin] = await database
    .select()
    .from(organizationsUsers)
    .innerJoin(organizations, eq(organizationsUsers.organizationId, organizations.id))
    .innerJoin(users, eq(organizationsUsers.userId, users.id))
    .where(and(eq(organizations.id, input.organizationId), eq(users.role, RolesEnum.ORGANIZATION_ADMIN)))
    .limit(1)

  if (!organizationAdmin) return null

  return {
    ...organizationAdmin?.users,
  }
}
