import type { db } from "@/server/db"
import { type EventInsert, type EventSelect, events } from "@/server/db/schema"

export const eventsCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: EventInsert
}): Promise<EventSelect | undefined> => {
  const [event] = await database.insert(events).values(input).returning()
  return event
}
