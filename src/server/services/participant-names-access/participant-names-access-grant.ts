import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import { ParticipantAccessNotificationEvent } from "@/constants/participant-access-notifications"
import type { db } from "@/server/db"
import { campaigns, organizations, participantNamesAccess } from "@/server/db/schema"

import { participantNamesAccessGetStatus } from "./participant-names-access-get-status"
import { participantNamesAccessNotify } from "./participant-names-access-notify"

const MAX_APPROVALS = 3
const INITIAL_DURATION_WEEKS = 4
const EXTENSION_DURATION_WEEKS = 2

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}

export const participantNamesAccessGrant = async ({
  database,
  campaignId,
  grantedByUserId,
}: {
  database: typeof db
  campaignId: string
  grantedByUserId: string
}) => {
  const campaign = await database.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
    columns: { id: true, status: true, organizationId: true, name: true },
  })

  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Fundraiser not found" })

  if (campaign.status !== CampaignsStatusEnum.ACTIVE) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Access can only be granted for active fundraisers" })
  }

  const org = await database.query.organizations.findFirst({
    where: eq(organizations.id, campaign.organizationId),
    columns: { fundraisingConsultantUserId: true, name: true },
  })

  if (!org?.fundraisingConsultantUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No Fundraising Consultant is assigned to this organization" })
  }

  // Evaluate status for THIS FC specifically — each (campaign, FC) pair has its own row and cycle.
  const { record, usedSlots, isActiveCycle, isGranted } = await participantNamesAccessGetStatus({
    database,
    campaignId,
    fundraiserUserId: org.fundraisingConsultantUserId,
  })

  if (isGranted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Access is already active for this fundraiser" })
  }

  const now = new Date()

  const buildSlot = (expiryDate: Date, durationWeeks: number) => ({
    expiry_date: expiryDate.toISOString(),
    granted_at: now.toISOString(),
    granted_by: grantedByUserId,
    revoked_at: null,
    revoked_by: null,
    reason_for_revoking: null,
    duration_weeks: durationWeeks,
    reminder_sent_at: null,
    expiry_notified_at: null,
  })

  const fundraiserUserId = org.fundraisingConsultantUserId

  // Case A — no row for this (campaign, FC) yet: very first cycle for this FC. Slot 1 runs for 4 weeks.
  // A freshly-reassigned FC lands here, getting its own row and a fresh count of 3 — it does not inherit
  // the previous FC's used slots.
  if (!record) {
    const expiryDate = addWeeks(now, INITIAL_DURATION_WEEKS)
    await database.insert(participantNamesAccess).values({
      campaignId,
      fundraiserUserId,
      isActive: true,
      accessDetails: { "1": buildSlot(expiryDate, INITIAL_DURATION_WEEKS) },
    })
    await participantNamesAccessNotify({
      database,
      campaignId,
      fundraiserUserId,
      event: ParticipantAccessNotificationEvent.GRANTED,
      expiryDate: expiryDate.toISOString(),
      approvalNumber: 1,
      durationWeeks: INITIAL_DURATION_WEEKS,
    })
    return { approvalNumber: 1, expiryDate: expiryDate.toISOString(), durationWeeks: INITIAL_DURATION_WEEKS }
  }

  // Case B — this FC's latest row is a closed cycle (is_active=false, set manually with reset_details).
  // Start a fresh cycle by inserting a NEW row. Post-reset cycles always use 2-week windows.
  if (!isActiveCycle) {
    const expiryDate = addWeeks(now, EXTENSION_DURATION_WEEKS)
    await database.insert(participantNamesAccess).values({
      campaignId,
      fundraiserUserId,
      isActive: true,
      accessDetails: { "1": buildSlot(expiryDate, EXTENSION_DURATION_WEEKS) },
    })
    await participantNamesAccessNotify({
      database,
      campaignId,
      fundraiserUserId,
      event: ParticipantAccessNotificationEvent.REENABLED,
      expiryDate: expiryDate.toISOString(),
      approvalNumber: 1,
      durationWeeks: EXTENSION_DURATION_WEEKS,
    })
    return { approvalNumber: 1, expiryDate: expiryDate.toISOString(), durationWeeks: EXTENSION_DURATION_WEEKS }
  }

  // Case C — active cycle with a free slot: this is an extension (2 weeks), appended to the current row.
  if (usedSlots >= MAX_APPROVALS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "All access grants have been used. A WFC representative must reset access before a new cycle can begin.",
    })
  }

  const nextSlot = (usedSlots + 1) as 1 | 2 | 3
  const nextSlotKey = String(nextSlot) as "1" | "2" | "3"
  const expiryDate = addWeeks(now, EXTENSION_DURATION_WEEKS)

  await database
    .update(participantNamesAccess)
    .set({
      accessDetails: { ...record.accessDetails, [nextSlotKey]: buildSlot(expiryDate, EXTENSION_DURATION_WEEKS) },
    })
    .where(eq(participantNamesAccess.id, record.id))

  await participantNamesAccessNotify({
    database,
    campaignId,
    fundraiserUserId,
    event: ParticipantAccessNotificationEvent.EXTENDED,
    expiryDate: expiryDate.toISOString(),
    approvalNumber: nextSlot,
    durationWeeks: EXTENSION_DURATION_WEEKS,
  })

  return { approvalNumber: nextSlot, expiryDate: expiryDate.toISOString(), durationWeeks: EXTENSION_DURATION_WEEKS }
}
