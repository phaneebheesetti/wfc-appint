import { and, eq, inArray } from "drizzle-orm"

import { type FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { ParticipantAccessNotificationEvent } from "@/constants/participant-access-notifications"
import type { db } from "@/server/db"
import { campaigns, participantNamesAccess } from "@/server/db/schema"

import { participantNamesAccessNotify } from "./participant-names-access-notify"

export const participantNamesAccessRevokeByOrg = async ({
  database,
  organizationId,
  revokedByUserId,
  reason,
}: {
  database: typeof db
  organizationId: string
  revokedByUserId: string
  reason: FcAccessRevocationReasonEnum
}) => {
  const orgCampaigns = await database.query.campaigns.findMany({
    where: eq(campaigns.organizationId, organizationId),
    columns: { id: true },
  })

  if (orgCampaigns.length === 0) return

  const campaignIds = orgCampaigns.map(c => c.id)

  const activeRecords = await database.query.participantNamesAccess.findMany({
    where: and(inArray(participantNamesAccess.campaignId, campaignIds), eq(participantNamesAccess.isActive, true)),
  })

  if (activeRecords.length === 0) return

  const now = new Date().toISOString()

  for (const record of activeRecords) {
    const usedSlots = Object.keys(record.accessDetails).length
    const currentSlotKey = String(usedSlots) as "1" | "2" | "3"
    const currentSlot = record.accessDetails[currentSlotKey]
    // Skip rows with no slot or whose current slot is already revoked.
    if (!currentSlot || currentSlot.revoked_at) continue

    const updatedDetails = {
      ...record.accessDetails,
      [currentSlotKey]: {
        ...currentSlot,
        revoked_at: now,
        revoked_by: revokedByUserId,
        reason_for_revoking: reason,
      },
    }

    // is_active stays true; only the slot is stamped revoked. is_active is set false only by a manual WFC reset.
    await database
      .update(participantNamesAccess)
      .set({ accessDetails: updatedDetails })
      .where(eq(participantNamesAccess.id, record.id))

    // Notify the FC and the organization's admins.
    await participantNamesAccessNotify({
      database,
      campaignId: record.campaignId,
      fundraiserUserId: record.fundraiserUserId,
      event: ParticipantAccessNotificationEvent.REVOKED,
      expiryDate: currentSlot.expiry_date,
      approvalNumber: usedSlots,
      durationWeeks: currentSlot.duration_weeks,
      reason,
    })
  }
}
