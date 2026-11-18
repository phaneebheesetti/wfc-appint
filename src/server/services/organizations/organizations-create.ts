import type { db } from "@/server/db"
import { type OrganizationInsert, organizations } from "@/server/db/schema"

export const organizationsCreate = async ({ database, input }: { database: typeof db; input: OrganizationInsert }) => {
  const [createdOrganization] = await database.insert(organizations).values(input).returning()
  return createdOrganization
}
