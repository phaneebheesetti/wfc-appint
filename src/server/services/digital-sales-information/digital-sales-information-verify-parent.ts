import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { participantParentUsers, users } from "@/server/db/schema"

/**
 * A parent is considered to manage a participant when either exists:
 *  1. a row in the `participant_parent_mapping` table
 *  2. `users.parent_user_id` on the participant's own row
 */
export const digitalSalesInformationVerifyParent = async ({
  database,
  parentUserId,
  participantId,
}: {
  database: typeof db
  parentUserId: string
  participantId: string
}): Promise<boolean> => {
  const mapping = await database.query.participantParentUsers.findFirst({
    where: and(
      eq(participantParentUsers.parentUserId, parentUserId),
      eq(participantParentUsers.participantUserId, participantId)
    ),
  })
  if (!!mapping) return true

  const legacyLink = await database.query.users.findFirst({
    columns: { id: true },
    where: and(eq(users.id, participantId), eq(users.parentUserId, parentUserId)),
  })
  return !!legacyLink
}
