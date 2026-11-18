import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { campaigns, organizations, participantNamesAccess } from "@/server/db/schema"

const MAX_APPROVALS = 3

// Status shown when no access record applies (no FC assigned, or no row yet for the current FC).
const EMPTY_STATUS = {
  record: null,
  usedSlots: 0,
  currentSlot: null,
  slotsRemaining: MAX_APPROVALS,
  isActiveCycle: false,
  isGranted: false,
}

export const participantNamesAccessGetStatus = async ({
  database,
  campaignId,
  fundraiserUserId,
}: {
  database: typeof db
  campaignId: string
  // The FC whose access to evaluate. Callers may pass it to avoid re-resolving; otherwise it is
  // resolved from the campaign's organization (the current FC).
  fundraiserUserId?: string | null
}) => {
  // Access records are keyed per (campaign, FC): each FC has its own row and its own cycle of approvals.
  // Resolve the campaign's CURRENT Fundraising Consultant when the caller didn't supply one.
  let fcUserId = fundraiserUserId ?? null
  if (!fcUserId) {
    const campaign = await database.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
      columns: { organizationId: true },
    })
    if (campaign) {
      const org = await database.query.organizations.findFirst({
        where: eq(organizations.id, campaign.organizationId),
        columns: { fundraisingConsultantUserId: true },
      })
      fcUserId = org?.fundraisingConsultantUserId ?? null
    }
  }

  // No FC assigned → no access is possible.
  if (!fcUserId) return { ...EMPTY_STATUS }

  // The most recent row for THIS (campaign, FC) is the current cycle. Older rows (is_active=false,
  // with reset_details) are historical cycles kept for audit after a manual WFC reset.
  const record = await database.query.participantNamesAccess.findFirst({
    where: and(
      eq(participantNamesAccess.campaignId, campaignId),
      eq(participantNamesAccess.fundraiserUserId, fcUserId)
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  if (!record) return { ...EMPTY_STATUS }

  const usedSlots = Object.keys(record.accessDetails).length
  const currentSlotKey = usedSlots > 0 ? (String(usedSlots) as "1" | "2" | "3") : null
  const currentSlot = currentSlotKey ? (record.accessDetails[currentSlotKey] ?? null) : null
  const slotsRemaining = MAX_APPROVALS - usedSlots

  // is_active marks the live cycle. It is only ever set false manually (with reset_details).
  const isActiveCycle = record.isActive

  const isGranted = isActiveCycle && !!currentSlot && !currentSlot.revoked_at

  return { record, usedSlots, currentSlot, slotsRemaining, isActiveCycle, isGranted }
}
