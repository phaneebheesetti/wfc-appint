import { eq } from "drizzle-orm"

import { FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { db } from "@/server/db"
import { campaigns } from "@/server/db/schema"
import { participantNamesAccessRevoke } from "@/server/services/participant-names-access"

export const campaignsDelete = async ({
  database,
  input,
  deletedByUserId,
}: {
  database: typeof db
  input: { id: string }
  deletedByUserId?: string
}) => {
  const [updatedCampaign] = await database
    .update(campaigns)
    .set({ deletedAt: new Date() })
    .where(eq(campaigns.id, input.id))
    .returning()

  // Revoke any active participant name access when the fundraiser is deleted. Runs on the privileged
  // base connection (`db`), not the request transaction (`database`), so RLS on participant_names_access
  // doesn't silently filter out the revoke for roles without participant_names_access permissions.
  await participantNamesAccessRevoke({
    database: db,
    campaignId: input.id,
    revokedByUserId: deletedByUserId ?? null,
    reason: FcAccessRevocationReasonEnum.FUNDRAISER_DELETED,
  })

  return updatedCampaign
}
