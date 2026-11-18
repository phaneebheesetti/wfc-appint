import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { prizes } from "@/server/db/schema"

export const prizesDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(prizes).where(eq(prizes.id, input.id))
}
