import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type OrganizationUserInsert, organizationsUsers } from "@/server/db/schema"

export const organizationsUsersUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<OrganizationUserInsert> & {
    userId?: string | null
    organizationId?: string | null
  }
}) => {
  const [organizationUser] = await database
    .update(organizationsUsers)
    .set(input)
    .where(
      and(eq(organizationsUsers.userId, input.userId!), eq(organizationsUsers.organizationId, input.organizationId!))
    )
    .returning()
  return organizationUser
}
