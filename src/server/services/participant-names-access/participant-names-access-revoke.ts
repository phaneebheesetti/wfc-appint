import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"

import { type FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { ParticipantAccessNotificationEvent } from "@/constants/participant-access-notifications"
import type { db } from "@/server/db"
import { participantNamesAccess } from "@/server/db/schema"

import { participantNamesAccessGetStatus } from "./participant-names-access-get-status"
import { participantNamesAccessNotify } from "./participant-names-access-notify"

export const participantNamesAccessRevoke = async ({
  database,
  campaignId,
  revokedByUserId,
  reason,
}: {
  database: typeof db
  campaignId: string
  revokedByUserId: string | null
  reason: FcAccessRevocationReasonEnum
}) => {
  // Resolve the SAME record + current slot the UI reads via getStatus (current FC, live cycle).
  // Revoking anything else would update a row the UI never re-reads, so the toast would report
  // success while the displayed status stays "Active".
  const { record, usedSlots, currentSlot, isActiveCycle } = await participantNamesAccessGetStatus({
    database,
    campaignId,
  })

  // Only the live cycle can be revoked. is_active is never flipped here — it stays true so the
  // remaining slots in this cycle can still be re-granted. It is set false only by a manual WFC reset.
  if (!record || !isActiveCycle) return null

  const currentSlotKey = String(usedSlots) as "1" | "2" | "3"

  if (!currentSlot) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Access details are in an inconsistent state" })
  }

  // Already revoked — nothing to do (idempotent).
  if (currentSlot.revoked_at) return null

  const now = new Date().toISOString()
  const updatedDetails = {
    ...record.accessDetails,
    [currentSlotKey]: {
      ...currentSlot,
      revoked_at: now,
      revoked_by: revokedByUserId,
      reason_for_revoking: reason,
    },
  }

  await database
    .update(participantNamesAccess)
    .set({ accessDetails: updatedDetails })
    .where(eq(participantNamesAccess.id, record.id))

  await participantNamesAccessNotify({
    database,
    campaignId,
    fundraiserUserId: record.fundraiserUserId,
    event: ParticipantAccessNotificationEvent.REVOKED,
    expiryDate: currentSlot.expiry_date,
    approvalNumber: usedSlots,
    durationWeeks: currentSlot.duration_weeks,
    reason,
  })

  return { revokedAt: now }
}
