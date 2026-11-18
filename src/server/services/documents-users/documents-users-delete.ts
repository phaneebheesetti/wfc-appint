import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documentsUsers } from "@/server/db/schema"

export const documentsUsersDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(documentsUsers).where(eq(documentsUsers.id, input.id))
}
