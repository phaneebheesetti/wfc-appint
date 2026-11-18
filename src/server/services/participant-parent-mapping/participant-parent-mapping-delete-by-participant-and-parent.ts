import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { participantParentUsers } from "@/server/db/schema"

export const participantParentMappingDeleteByParticipantAndParent = async ({
  database,
  input,
}: {
  database: typeof db
  input: { participantUserId: string; parentUserId: string }
}) => {
  const [deleted] = await database
    .delete(participantParentUsers)
    .where(
      and(
        eq(participantParentUsers.participantUserId, input.participantUserId),
        eq(participantParentUsers.parentUserId, input.parentUserId)
      )
    )
    .returning()

  return deleted ?? null
}
