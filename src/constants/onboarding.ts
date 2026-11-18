// Per-user, per-campaign onboarding markers. These live in a single jsonb column on the user
// (users.onboardingProgress), keyed by campaignId so a user can have progress for more than one campaign
// without it bleeding across campaigns.
//
// The first three are FC onboarding step-completion markers and live on the *FC's* user row. `welcomeSeenAt`
// is stored on the *org admin's* row when they dismiss the "new fundraiser assigned" welcome popup for that
// campaign — same column, different user row, additive key, so the two never collide.

export type CampaignOnboardingProgress = {
  // ISO timestamps (or null when the step has been cleared). Truthiness === "step done".
  inventorySavedAt?: string | null
  prizePaymentSavedAt?: string | null
  sponsorInviteSavedAt?: string | null
  // Stamped on the org admin's row when this campaign is assigned to them as sponsor (on create, and re-stamped
  // on every reassignment). Its presence is what makes the "new fundraiser assigned" welcome popup eligible —
  // fundraisers from before this feature have no marker and so never pop.
  welcomePendingAt?: string | null
  // Set once the org admin (campaign sponsor) has seen/dismissed the welcome popup for this assignment. The
  // popup shows while welcomePendingAt is set and welcomeSeenAt is unset or older than welcomePendingAt.
  welcomeSeenAt?: string | null
  isCreatedFromOrganizations?: boolean
}

export type UserOnboardingProgress = Record<string, CampaignOnboardingProgress>

export type OnboardingStepKey = keyof CampaignOnboardingProgress

export const ONBOARDING_STEP_KEYS = [
  "inventorySavedAt",
  "prizePaymentSavedAt",
  "sponsorInviteSavedAt",
  "welcomePendingAt",
  "welcomeSeenAt",
  "isCreatedFromOrganizations",
] as const satisfies readonly OnboardingStepKey[]

export type CampaignSetupProgress = {
  stripeSaved?: boolean
  prizesAndEventsSaved?: boolean
  permissionSlipSaved?: boolean
  finalReviewCompleted?: boolean
}
