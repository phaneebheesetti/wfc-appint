import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations } from "@/server/db/schema"

export const organizationsDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const [updatedOrganization] = await database
    .update(organizations)
    .set({ deletedAt: new Date() })
    .where(eq(organizations.id, input.id))
    .returning()

  return updatedOrganization
}
