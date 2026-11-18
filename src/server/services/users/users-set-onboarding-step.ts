import { eq, sql } from "drizzle-orm"

import { type OnboardingStepKey } from "@/constants/onboarding"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersSetOnboardingStep = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    userId: string
    campaignId: string
    step: OnboardingStepKey
    savedAt: string | null
    isCreatedFromOrganization?: boolean
  }
}) => {
  const { userId, campaignId, step, savedAt } = input

  await database
    .update(users)
    .set({
      onboardingProgress: sql`
        coalesce(${users.onboardingProgress}, '{}'::jsonb)
        || jsonb_build_object(
          ${campaignId}::text,
          coalesce(${users.onboardingProgress} -> ${campaignId}, '{}'::jsonb)
            || ${!!savedAt ? sql`jsonb_build_object(${step}::text, to_jsonb(${savedAt}::text))` : sql`jsonb_build_object(${step}::text, true)`}
        )
      `,
    })
    .where(eq(users.id, userId))
}
