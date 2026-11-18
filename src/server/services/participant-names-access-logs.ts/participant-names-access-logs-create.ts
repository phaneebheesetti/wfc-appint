import type { db } from "@/server/db"
import { type ParticipantNamesAccessLogInsert, participantNamesAccessLogs } from "@/server/db/schema"

export const participantNamesAccessLogCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: ParticipantNamesAccessLogInsert
}) => {
  const [created] = await database.insert(participantNamesAccessLogs).values(input).returning()

  return created ?? null
}
