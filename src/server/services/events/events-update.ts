import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type EventInsert, type EventSelect, events } from "@/server/db/schema"

export const eventsUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<EventInsert> & { id?: string | null }
}): Promise<EventSelect | undefined> => {
  const [event] = await database.update(events).set(input).where(eq(events.id, input.id!)).returning()
  return event
}
