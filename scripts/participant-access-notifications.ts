import "dotenv/config"
import { eq } from "drizzle-orm"

import { CampaignsStatusEnum, FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { ParticipantAccessNotificationEvent } from "@/constants/participant-access-notifications"
import { db } from "@/server/db"
import { type AccessSlot, participantNamesAccess } from "@/server/db/schema"
import { participantNamesAccessNotify } from "@/server/services/participant-names-access"
import { utcDay } from "@/utils/date"

const MS_PER_DAY = 86_400_000
const DRY_RUN = process.argv.includes("--dry-run")

const reminderLeadDays = (durationWeeks: number) => (durationWeeks >= 4 ? 3 : 2)

function resolveDurationWeeks(slot: AccessSlot): number {
  if (slot.duration_weeks) return slot.duration_weeks
  if (slot.granted_at && slot.expiry_date) {
    const days = Math.round((utcDay(new Date(slot.expiry_date)) - utcDay(new Date(slot.granted_at))) / MS_PER_DAY)
    return days >= 21 ? 4 : 2
  }
  return 2
}

async function main() {
  const now = new Date()
  const todayUtc = utcDay(now)
  const nowIso = now.toISOString()

  console.log(`[participant-access] Run start ${nowIso}${DRY_RUN ? " (dry-run)" : ""}`)

  const records = await db.query.participantNamesAccess.findMany({
    where: eq(participantNamesAccess.isActive, true),
    with: { campaign: { columns: { id: true, status: true, deletedAt: true } } },
  })

  let remindedCount = 0
  let expiredCount = 0

  for (const record of records) {
    const campaign = record.campaign
    // Only ACTIVE, non-deleted campaigns. Closed/deleted fundraisers already revoke via cascade.
    if (!campaign || campaign.deletedAt || campaign.status !== CampaignsStatusEnum.ACTIVE) continue

    const usedSlots = Object.keys(record.accessDetails).length
    if (usedSlots === 0) continue

    const currentSlotKey = String(usedSlots) as "1" | "2" | "3"
    const currentSlot = record.accessDetails[currentSlotKey]
    if (!currentSlot?.expiry_date) continue

    // Slot already revoked (manual OA revoke or a cascade) is terminal. Do NOT
    // overwrite its reason with EXPIRED or send a duplicate email
    if (currentSlot.revoked_at) continue

    const durationWeeks = resolveDurationWeeks(currentSlot)
    const expiryUtc = utcDay(new Date(currentSlot.expiry_date))

    // Auto-expiry. The expiry date is inclusive: access remains available for the whole of
    // expiry_date (in UTC) and is revoked on the first run of the following day (strictly greater
    // than), so the expiry date itself is a full access day.
    if (todayUtc > expiryUtc) {
      if (currentSlot.expiry_notified_at) continue

      console.log(
        `[participant-access] EXPIRED campaign=${record.campaignId} fc=${record.fundraiserUserId} expiry=${currentSlot.expiry_date}`
      )
      expiredCount++

      if (!DRY_RUN) {
        const updatedDetails = {
          ...record.accessDetails,
          [currentSlotKey]: {
            ...currentSlot,
            revoked_at: nowIso,
            revoked_by: null,
            reason_for_revoking: FcAccessRevocationReasonEnum.EXPIRED,
            expiry_notified_at: nowIso,
          },
        }
        await db
          .update(participantNamesAccess)
          .set({ accessDetails: updatedDetails })
          .where(eq(participantNamesAccess.id, record.id))

        await participantNamesAccessNotify({
          database: db,
          campaignId: record.campaignId,
          fundraiserUserId: record.fundraiserUserId,
          event: ParticipantAccessNotificationEvent.EXPIRED,
          expiryDate: currentSlot.expiry_date,
          approvalNumber: usedSlots,
          durationWeeks,
          reason: FcAccessRevocationReasonEnum.EXPIRED,
        })
      }
      continue
    }

    // Approaching-expiry reminder
    if (currentSlot.reminder_sent_at) continue

    const reminderThresholdUtc = expiryUtc - reminderLeadDays(durationWeeks) * MS_PER_DAY
    if (todayUtc >= reminderThresholdUtc) {
      console.log(
        `[participant-access] REMINDER campaign=${record.campaignId} fc=${record.fundraiserUserId} expiry=${currentSlot.expiry_date}`
      )
      remindedCount++

      if (!DRY_RUN) {
        const updatedDetails = {
          ...record.accessDetails,
          [currentSlotKey]: { ...currentSlot, reminder_sent_at: nowIso },
        }
        await db
          .update(participantNamesAccess)
          .set({ accessDetails: updatedDetails })
          .where(eq(participantNamesAccess.id, record.id))

        await participantNamesAccessNotify({
          database: db,
          campaignId: record.campaignId,
          fundraiserUserId: record.fundraiserUserId,
          event: ParticipantAccessNotificationEvent.EXPIRING_SOON,
          expiryDate: currentSlot.expiry_date,
          approvalNumber: usedSlots,
          durationWeeks,
        })
      }
    }
  }

  console.log(
    `[participant-access] Run complete — scanned=${records.length} reminded=${remindedCount} expired=${expiredCount}${DRY_RUN ? " (dry-run, no changes)" : ""}`
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("[participant-access] Run failed:", error)
    process.exit(1)
  })
