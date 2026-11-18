import { and, eq, isNull, ne } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { type UserOnboardingProgress } from "@/constants/onboarding"
import type { db } from "@/server/db"
import { campaigns, users } from "@/server/db/schema"

// Picks the "new fundraiser assigned" welcome popup to show a logged-in org admin, or null when there's nothing
// to show. A fundraiser is a candidate only when it carries a welcomePendingAt marker on this admin's
// onboarding_progress — i.e. it was assigned to them on/after this feature shipped. Fundraisers from before
// the feature have no marker and so never pop, with no backfill needed. A candidate is shown until the admin
// has seen THAT assignment (welcomeSeenAt unset or older than welcomePendingAt) — so reassigning a fundraiser
// (even an old one) to this admin re-stamps welcomePendingAt and pops again. When two are pending, the one
// assigned earliest shows first; once seen it drops out and the next pending one surfaces. Drafts never pop.
export const campaignsGetOrgAdminWelcomeCampaign = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const { userId } = input

  // Welcome markers live on the admin's own onboarding_progress jsonb, keyed by campaignId.
  const admin = await database.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingProgress: true },
  })
  const progress: UserOnboardingProgress = admin?.onboardingProgress ?? {}

  // Every published fundraiser this admin currently sponsors, across all organizations.
  const sponsored = await database.query.campaigns.findMany({
    where: and(
      eq(campaigns.sponsorId, userId),
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)
    ),
    with: {
      organization: true,
      createdByUser: true,
    },
  })

  // Keep only fundraisers whose organization is not soft-deleted, then filter for pending (unseen) assignments.
  const active = sponsored.filter(campaign => !campaign.organization?.deletedAt)

  const pending = active
    .filter(campaign => {
      const marks = progress[campaign.id]
      const pendingAt = marks?.welcomePendingAt
      if (!pendingAt) return false
      const seenAt = marks?.welcomeSeenAt
      // ISO UTC timestamps compare correctly as strings.
      return !seenAt || seenAt < pendingAt
    })
    .sort((a, b) => {
      const aAt = progress[a.id]!.welcomePendingAt!
      const bAt = progress[b.id]!.welcomePendingAt!
      return aAt < bAt ? -1 : aAt > bAt ? 1 : 0
    })

  return pending[0] ?? null
}
