import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { campaigns, users } from "@/server/db/schema"

export type CreateFundraiserStepStates = {
  fundraiser: "done" | "pending"
  inventory: "done" | "pending"
  prizePayment: "done" | "pending"
  sponsorInvite: "done" | "pending"
}

export type CreateFundraiserState = {
  stepStates: CreateFundraiserStepStates
}

const EMPTY_STEP_STATES: CreateFundraiserStepStates = {
  fundraiser: "pending",
  inventory: "pending",
  prizePayment: "pending",
  sponsorInvite: "pending",
}

export const campaignsCreationState = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId: string | null }
}): Promise<CreateFundraiserState> => {
  const { campaignId, userId } = input

  if (!!campaignId) {
    const draftCampaign =
      (await database.query.campaigns.findFirst({
        where: and(eq(campaigns.id, campaignId)),
      })) ?? null

    const draftCreatedByUser = draftCampaign
      ? await database.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { onboardingProgress: true },
        })
      : null
    const progress = draftCampaign ? draftCreatedByUser?.onboardingProgress?.[draftCampaign.id] : undefined

    const stepStates: CreateFundraiserStepStates = {
      fundraiser: draftCampaign ? "done" : "pending",
      inventory: progress?.inventorySavedAt ? "done" : "pending",
      prizePayment: progress?.prizePaymentSavedAt ? "done" : "pending",
      sponsorInvite: progress?.sponsorInviteSavedAt ? "done" : "pending",
    }

    return { stepStates }
  }
  return { stepStates: EMPTY_STEP_STATES }
}
