import { eq } from "drizzle-orm"

import { CampaignsStatusEnum, FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { db } from "@/server/db"
import { type CampaignInsert, campaigns } from "@/server/db/schema"
import { participantNamesAccessRevoke } from "@/server/services/participant-names-access"

import { usersSetOnboardingStep } from "../users/users-set-onboarding-step"

const CLOSED_STATUSES: string[] = [CampaignsStatusEnum.ENDED, CampaignsStatusEnum.CANCELLED]

export const campaignsUpdate = async ({
  database,
  input,
  updatedByUserId,
}: {
  database: typeof db
  input: Partial<CampaignInsert> & { id?: string }
  updatedByUserId?: string
}) => {
  const id = input.id!

  // Detect a real sponsor change so we can flag the new sponsor for the welcome popup. We only act on an
  // actual change (not when an edit happens to include the same sponsorId) to avoid resurfacing the popup
  // on unrelated edits.
  let reassignedTo: string | null = null
  let fundraiserJustClosed = false

  if (input.sponsorId !== undefined || input.status !== undefined) {
    const existing = await database.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
      columns: { sponsorId: true, status: true },
    })
    if (existing) {
      if (input.sponsorId !== undefined && existing.sponsorId !== input.sponsorId) {
        reassignedTo = input.sponsorId
      }
      if (
        input.status !== undefined &&
        CLOSED_STATUSES.includes(input.status) &&
        !CLOSED_STATUSES.includes(existing.status)
      ) {
        fundraiserJustClosed = true
      }
    }
  }

  const [campaign] = await database.update(campaigns).set(input).where(eq(campaigns.id, id)).returning()

  // Stamp the new sponsor's welcomePendingAt so the "new fundraiser assigned" popup fires for them — even for
  // an older fundraiser, since this re-stamp makes its assignment newer than any prior welcomeSeenAt.
  if (reassignedTo) {
    await usersSetOnboardingStep({
      database,
      input: { userId: reassignedTo, campaignId: id, step: "welcomePendingAt", savedAt: new Date().toISOString() },
    })
  }

  // Revoke any active participant name access when the fundraiser is closed. Runs on the privileged
  // base connection (`db`), not the request transaction (`database`), so RLS on participant_names_access
  // doesn't silently filter out the revoke for roles without participant_names_access permissions.
  if (fundraiserJustClosed) {
    await participantNamesAccessRevoke({
      database: db,
      campaignId: id,
      revokedByUserId: updatedByUserId ?? null,
      reason: FcAccessRevocationReasonEnum.FUNDRAISER_CLOSED,
    })
  }

  return campaign
}
