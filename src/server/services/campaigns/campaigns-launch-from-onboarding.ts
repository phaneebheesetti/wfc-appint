import { TRPCError } from "@trpc/server"
import { and, eq, isNull, or } from "drizzle-orm"

import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { db } from "@/server/db"
import { campaigns, casesTransactions, organizations, users } from "@/server/db/schema"

export type LaunchValidationIssue = {
  step: number
  name: "Product Selection" | "Feature Selection" | "Invite an Administrator"
}

export type CampaignsLaunchFromOnboardingResult =
  | {
      ok: true
      campaignId: string
      organizationId: string
    }
  | {
      ok: false
      missingSteps: LaunchValidationIssue[]
    }

// Promotes the FC's draft org + draft campaign to active in one transaction.
// If any onboarding step is unfilled, returns the missing-step list instead of throwing,
// so the UI can render the validation block under Step 6.
export const campaignsLaunchFromOnboarding = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}): Promise<CampaignsLaunchFromOnboardingResult> => {
  const { userId } = input

  const draftOrg = await database.query.organizations.findFirst({
    where: and(
      isNull(organizations.deletedAt),
      eq(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
      or(eq(organizations.fundraisingConsultantUserId, userId), eq(organizations.createdByUserId, userId))
    ),
    orderBy: (organizations, { desc }) => [desc(organizations.updatedAt), desc(organizations.createdAt)],
  })

  if (!draftOrg) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No draft organization found for this user" })
  }

  const draftCampaign = await database.query.campaigns.findFirst({
    where: and(
      eq(campaigns.organizationId, draftOrg.id),
      eq(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
      isNull(campaigns.deletedAt)
    ),
    orderBy: (campaigns, { desc }) => [desc(campaigns.updatedAt), desc(campaigns.createdAt)],
  })

  if (!draftCampaign) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No draft fundraiser found for this organization" })
  }

  // Step progress now lives on the FC user's onboarding_progress jsonb, keyed by campaignId.
  const fcUser = await database.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingProgress: true },
  })
  const progress = fcUser?.onboardingProgress?.[draftCampaign.id]

  const missingSteps: LaunchValidationIssue[] = []
  if (!progress?.inventorySavedAt) missingSteps.push({ step: 3, name: "Product Selection" })
  if (!progress?.prizePaymentSavedAt) missingSteps.push({ step: 4, name: "Feature Selection" })
  if (!progress?.sponsorInviteSavedAt || draftCampaign.sponsorId === userId) {
    // Either step 5 was skipped, or the sponsor is still the FC placeholder (option-b) — both count as missing.
    missingSteps.push({ step: 5, name: "Invite an Administrator" })
  }

  if (missingSteps.length > 0) {
    return { ok: false, missingSteps }
  }

  await database.transaction(async tx => {
    await tx
      .update(organizations)
      .set({ visibility: OrganizationsVisibilityEnum.PUBLISHED })
      .where(eq(organizations.id, draftOrg.id))

    await tx
      .update(campaigns)
      .set({ status: CampaignsStatusEnum.ACTIVE, visibility: CampaignsVisibilityEnum.PUBLISHED })
      .where(eq(campaigns.id, draftCampaign.id))

    // Drop the onboarding-only billed↔free link so it can't interact with post-launch inventory editing.
    await tx
      .update(casesTransactions)
      .set({ parentTransactionId: null })
      .where(
        and(
          eq(casesTransactions.campaignId, draftCampaign.id),
          eq(casesTransactions.type, CasesTransactionsTypeEnum.DELIVERED)
        )
      )
  })

  return { ok: true, campaignId: draftCampaign.id, organizationId: draftOrg.id }
}
