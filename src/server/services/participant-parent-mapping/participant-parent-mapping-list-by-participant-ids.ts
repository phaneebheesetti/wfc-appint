import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { participantParentUsers } from "@/server/db/schema"

export const participantParentMappingListByParticipantIds = async ({
  database,
  input,
}: {
  database: typeof db
  input: { participantUserIds: string[] }
}) => {
  if (input.participantUserIds.length === 0) return []

  const mappings = await database.query.participantParentUsers.findMany({
    where: inArray(participantParentUsers.participantUserId, input.participantUserIds),
    with: {
      parentUser: true,
    },
  })

  return mappings
}
