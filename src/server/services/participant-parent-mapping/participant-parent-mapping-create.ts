import type { db } from "@/server/db"
import { type ParticipantParentUserInsert, participantParentUsers } from "@/server/db/schema"

export const participantParentMappingCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: ParticipantParentUserInsert
}) => {
  const [created] = await database.insert(participantParentUsers).values(input).returning()

  return created ?? null
}
