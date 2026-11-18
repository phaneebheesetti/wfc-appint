import { TRPCError } from "@trpc/server"
import { and, eq, isNull } from "drizzle-orm"

import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { campaigns, casesTransactions, users } from "@/server/db/schema"

type LaunchValidationIssue = {
  step: number
  name: "Product Selection" | "Feature Selection" | "Invite an Administrator"
}

type CampaignsLaunchFromOrganizationResult =
  | {
      ok: true
      campaignId: string
    }
  | {
      ok: false
      missingSteps: LaunchValidationIssue[]
    }

export const campaignsLaunchFromOrganizations = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId: string }
}): Promise<CampaignsLaunchFromOrganizationResult> => {
  const { userId, campaignId } = input

  const draftCampaign = await database.query.campaigns.findFirst({
    where: and(
      eq(campaigns.id, campaignId),
      eq(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
      isNull(campaigns.deletedAt)
    ),
    orderBy: (campaigns, { desc }) => [desc(campaigns.updatedAt), desc(campaigns.createdAt)],
  })

  if (!draftCampaign) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No draft fundraiser found for this organization" })
  }

  const fcUser = await database.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingProgress: true },
  })
  const progress = fcUser?.onboardingProgress?.[draftCampaign.id]

  const missingSteps: LaunchValidationIssue[] = []
  if (!progress?.inventorySavedAt) missingSteps.push({ step: 3, name: "Product Selection" })
  if (!progress?.prizePaymentSavedAt) missingSteps.push({ step: 4, name: "Feature Selection" })
  if (!progress?.sponsorInviteSavedAt || draftCampaign.sponsorId === userId) {
    missingSteps.push({ step: 5, name: "Invite an Administrator" })
  }

  if (missingSteps.length > 0) {
    return { ok: false, missingSteps }
  }

  await database.transaction(async tx => {
    await tx
      .update(campaigns)
      .set({ status: CampaignsStatusEnum.ACTIVE, visibility: CampaignsVisibilityEnum.PUBLISHED })
      .where(eq(campaigns.id, draftCampaign.id))

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

  return { ok: true, campaignId: draftCampaign.id }
}
