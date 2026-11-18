import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { events } from "@/server/db/schema"

export const eventsDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(events).where(eq(events.id, input.id))
}
