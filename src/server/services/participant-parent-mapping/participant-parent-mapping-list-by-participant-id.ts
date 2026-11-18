import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { participantParentUsers } from "@/server/db/schema"

export const participantParentMappingListByParticipantId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { participantUserId: string }
}) => {
  const mappings = await database.query.participantParentUsers.findMany({
    where: eq(participantParentUsers.participantUserId, input.participantUserId),
    with: {
      parentUser: true,
    },
  })

  return mappings
}
