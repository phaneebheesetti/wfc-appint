import { and, eq, isNull, ne } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { type UserOnboardingProgress } from "@/constants/onboarding"
import type { db } from "@/server/db"
import { campaigns, users } from "@/server/db/schema"

import { usersSetOnboardingStep } from "../users/users-set-onboarding-step"

// Marks every currently-pending "new fundraiser assigned" welcome notification as seen for this admin.
// Called when the admin takes action on any popup — ensures that fundraisers assigned before the action
// don't surface as subsequent popups. Only new assignments stamped after this call will pop again.
export const campaignsMarkAllWelcomeSeen = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const { userId } = input

  const admin = await database.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingProgress: true },
  })
  const progress: UserOnboardingProgress = admin?.onboardingProgress ?? {}

  const sponsored = await database.query.campaigns.findMany({
    where: and(
      eq(campaigns.sponsorId, userId),
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)
    ),
    columns: { id: true },
  })

  const now = new Date().toISOString()

  const pendingIds = sponsored
    .filter(campaign => {
      const marks = progress[campaign.id]
      const pendingAt = marks?.welcomePendingAt
      if (!pendingAt) return false
      const seenAt = marks?.welcomeSeenAt
      return !seenAt || seenAt < pendingAt
    })
    .map(c => c.id)

  // PostgreSQL serialises concurrent UPDATEs to the same row, so Promise.all is safe here.
  await Promise.all(
    pendingIds.map(campaignId =>
      usersSetOnboardingStep({
        database,
        input: { userId, campaignId, step: "welcomeSeenAt", savedAt: now },
      })
    )
  )
}
