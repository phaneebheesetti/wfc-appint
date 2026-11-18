import type { db } from "@/server/db"
import { type OrganizationUserInsert, type OrganizationUserSelect, organizationsUsers } from "@/server/db/schema"

export const organizationsUsersCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: OrganizationUserInsert
}): Promise<OrganizationUserSelect | undefined> => {
  const [organizationUser] = await database.insert(organizationsUsers).values(input).returning()
  return organizationUser
}
