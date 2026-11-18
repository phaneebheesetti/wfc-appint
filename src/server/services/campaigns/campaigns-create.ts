import type { db } from "@/server/db"
import { type CampaignInsert, campaigns } from "@/server/db/schema"

import { usersSetOnboardingStep } from "../users/users-set-onboarding-step"

export const campaignsCreate = async ({ database, input }: { database: typeof db; input: CampaignInsert }) => {
  const [createdCampaign] = await database.insert(campaigns).values(input).returning()

  // Flag the sponsor for the "new fundraiser assigned" welcome popup. Set even for drafts created via the
  // onboarding flow — the popup is gated to published fundraisers, so it surfaces once the draft is launched.
  if (createdCampaign) {
    await usersSetOnboardingStep({
      database,
      input: {
        userId: createdCampaign.sponsorId,
        campaignId: createdCampaign.id,
        step: "welcomePendingAt",
        savedAt: new Date().toISOString(),
      },
    })
  }

  return createdCampaign
}
