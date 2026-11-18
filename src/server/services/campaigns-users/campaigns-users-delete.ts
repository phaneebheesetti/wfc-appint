import { eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"

export const campaignsUsersDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(campaignsUsers).where(eq(campaignsUsers.id, input.id))
}
