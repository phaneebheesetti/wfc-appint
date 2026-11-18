import { TRPCError } from "@trpc/server"
import { and, eq, inArray, isNull, ne } from "drizzle-orm"

import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { campaigns, organizations, organizationsUsers, users } from "@/server/db/schema"

import { campaignsUpdate } from "../campaigns/campaigns-update"

// A reassignment target must be an active or pending member — never inactive or deleted.
const EXCLUDED_REASSIGN_STATUSES: string[] = [UsersStatusEnum.INACTIVE, UsersStatusEnum.DELETED]

interface OrganizationsUsersDeleteWithReassignInput {
  /** organizations_users row id to remove */
  id: string
  organizationId: string
  /** user being removed from the organization */
  userId: string
  /** required when the member is the organization's primary admin (organizations.adminUserId) */
  newAdminUserId?: string | null
  /** one entry per campaign this member sponsors in this org (sponsorId is NOT NULL, so all are required) */
  campaignSponsorReassignments?: { campaignId: string; newSponsorId: string }[]
}

/**
 * Removes an organization member and reassigns the references that would otherwise dangle:
 *   1. the org's primary admin (organizations.adminUserId), when the member holds it
 *   2. every campaign the member sponsors in this org (campaigns.sponsorId is NOT NULL)
 * then deletes the membership row. All steps run on `database`, which is already the request
 * transaction (see user-role-middleware) — so a throw at any step rolls the whole operation back.
 *
 * The reassignment sets are re-derived and validated here rather than trusted from the client, so a
 * bypassed UI can't leave a stale admin pointer or an un-reassigned campaign.
 */
export const organizationsUsersDeleteWithReassign = async ({
  database,
  input,
  updatedByUserId,
}: {
  database: typeof db
  input: OrganizationsUsersDeleteWithReassignInput
  updatedByUserId?: string
}) => {
  const { id, organizationId, userId, newAdminUserId } = input
  const reassignments = input.campaignSponsorReassignments ?? []

  // A reassignment target must never be the member being removed.
  if (newAdminUserId && newAdminUserId === userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The new organization admin cannot be the member being removed",
    })
  }
  if (reassignments.some(reassignment => reassignment.newSponsorId === userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A campaign cannot be reassigned to the member being removed",
    })
  }

  // Reject any target that has gone inactive/deleted (or vanished) since the popup loaded — the dropdown
  // hides these, but a stale client selection must not be able to hand a role to an unusable account.
  const targetUserIds = [
    ...(newAdminUserId ? [newAdminUserId] : []),
    ...reassignments.map(reassignment => reassignment.newSponsorId),
  ]

  if (targetUserIds.length > 0) {
    const targetUsers = await database.query.users.findMany({
      where: inArray(users.id, targetUserIds),
      columns: { id: true, status: true, deletedAt: true },
    })
    const usableTargetIds = new Set(
      targetUsers
        .filter(target => !target.deletedAt && !EXCLUDED_REASSIGN_STATUSES.includes(target.status ?? ""))
        .map(target => target.id)
    )

    if (targetUserIds.some(targetId => !usableTargetIds.has(targetId))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot reassign to an inactive or deleted member",
      })
    }
  }

  // 1. Reassign the organization's primary admin when the member holds it.
  const organization = await database.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { adminUserId: true },
  })

  if (organization?.adminUserId === userId) {
    if (!newAdminUserId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A new organization admin must be selected before removing this member",
      })
    }
    await database
      .update(organizations)
      .set({ adminUserId: newAdminUserId })
      .where(eq(organizations.id, organizationId))
  }

  // 2. Reassign every campaign this member sponsors in this org. The filter mirrors
  //    campaignsGetCampaignsByUserIdWithSponsor so the server validates exactly the set the UI presents.
  const sponsoredCampaigns = await database.query.campaigns.findMany({
    where: and(
      eq(campaigns.sponsorId, userId),
      eq(campaigns.organizationId, organizationId),
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
      // Only an active fundraiser's sponsor is reassignable
      eq(campaigns.status, CampaignsStatusEnum.ACTIVE)
    ),
    columns: { id: true },
  })

  const newSponsorByCampaignId = new Map(
    reassignments.map(reassignment => [reassignment.campaignId, reassignment.newSponsorId])
  )

  for (const campaign of sponsoredCampaigns) {
    const newSponsorId = newSponsorByCampaignId.get(campaign.id)
    if (!newSponsorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Every campaign sponsored by this member must be reassigned before removal",
      })
    }
    // Reuse campaignsUpdate so the new sponsor's "new fundraiser assigned" welcome popup fires.
    await campaignsUpdate({ database, input: { id: campaign.id, sponsorId: newSponsorId }, updatedByUserId })
  }

  // 3. Remove the membership row (same behaviour as organizationsUsersDelete).
  await database.delete(organizationsUsers).where(eq(organizationsUsers.id, id))
}
