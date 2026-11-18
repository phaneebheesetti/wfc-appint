import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizationsUsers } from "@/server/db/schema"

export const organizationsUsersDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(organizationsUsers).where(eq(organizationsUsers.id, input.id))
}
