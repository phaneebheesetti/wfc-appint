import { and, count, eq, isNull, ne, or } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { db } from "@/server/db"
import { type Campaign, type Organization, campaigns, organizations, users } from "@/server/db/schema"

export type FCOnboardingStepStates = {
  organization: "done" | "pending"
  fundraiser: "done" | "pending"
  inventory: "done" | "pending"
  prizePayment: "done" | "pending"
  sponsorInvite: "done" | "pending"
}

export type FCOnboardingState = {
  isNewUser: boolean
  draftOrganization: Organization | null
  draftCampaign: Campaign | null
  stepStates: FCOnboardingStepStates
}

const EMPTY_STEP_STATES: FCOnboardingStepStates = {
  organization: "pending",
  fundraiser: "pending",
  inventory: "pending",
  prizePayment: "pending",
  sponsorInvite: "pending",
}

// Returns the FC's onboarding state in one query. The onboarding (new-user) view is shown when any of:
//   1. the FC has no orgs,
//   2. the FC has a draft org/campaign still in progress, or
//   3. the FC has org(s) but none with an active campaign in them.
// In other words, the FC only graduates to the active dashboard once they have at least one active
// (non-draft) org holding at least one active (non-draft) campaign AND no draft is in progress.
// Existing draft org/campaign are returned so the UI can hydrate on re-entry.
export const organizationsFCOnboardingState = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}): Promise<FCOnboardingState> => {
  const { userId } = input

  // FC-owned orgs: assigned-to OR created-by (matches organizationsListPaginatedFromUserId behavior for SALES_REPRESENTATIVE).
  const fcOrgMatch = or(
    eq(organizations.fundraisingConsultantUserId, userId),
    eq(organizations.createdByUserId, userId)
  )

  // Graduation bar: at least one active (non-draft) org that already holds an active (non-draft) campaign.
  // This is what distinguishes "no orgs" / "org without campaigns" (cases 1 & 3) from a launched FC.
  const [launchedResult] = await database
    .select({ count: count() })
    .from(organizations)
    .innerJoin(campaigns, eq(campaigns.organizationId, organizations.id))
    .where(
      and(
        isNull(organizations.deletedAt),
        ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
        isNull(campaigns.deletedAt),
        ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
        fcOrgMatch
      )
    )

  const hasLaunchedFundraiser = (launchedResult?.count ?? 0) > 0

  // Find the most recently updated draft org for this FC (resume point for onboarding — case 2).
  const draftOrganization =
    (await database.query.organizations.findFirst({
      where: and(
        isNull(organizations.deletedAt),
        eq(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
        fcOrgMatch
      ),
      orderBy: (organizations, { desc }) => [desc(organizations.updatedAt), desc(organizations.createdAt)],
    })) ?? null

  // New user when they haven't launched a fundraiser yet (cases 1 & 3) OR have a draft to resume (case 2).
  const isNewUser = !hasLaunchedFundraiser || draftOrganization !== null

  if (!isNewUser) {
    return { isNewUser: false, draftOrganization: null, draftCampaign: null, stepStates: EMPTY_STEP_STATES }
  }

  if (!draftOrganization) {
    return { isNewUser: true, draftOrganization: null, draftCampaign: null, stepStates: EMPTY_STEP_STATES }
  }

  // Find the most recently updated draft campaign on that org (multi-draft safeguard).
  const draftCampaign =
    (await database.query.campaigns.findFirst({
      where: and(
        eq(campaigns.organizationId, draftOrganization.id),
        eq(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
        isNull(campaigns.deletedAt)
      ),
      orderBy: (campaigns, { desc }) => [desc(campaigns.updatedAt), desc(campaigns.createdAt)],
    })) ?? null

  // Step progress now lives on the FC user's onboarding_progress jsonb, keyed by campaignId.
  const fcUser = draftCampaign
    ? await database.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { onboardingProgress: true },
      })
    : null
  const progress = draftCampaign ? fcUser?.onboardingProgress?.[draftCampaign.id] : undefined

  const stepStates: FCOnboardingStepStates = {
    organization: "done",
    fundraiser: draftCampaign ? "done" : "pending",
    inventory: progress?.inventorySavedAt ? "done" : "pending",
    prizePayment: progress?.prizePaymentSavedAt ? "done" : "pending",
    sponsorInvite: progress?.sponsorInviteSavedAt ? "done" : "pending",
  }

  return { isNewUser: true, draftOrganization, draftCampaign, stepStates }
}
