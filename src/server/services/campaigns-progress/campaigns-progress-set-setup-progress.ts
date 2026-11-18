import { sql } from "drizzle-orm"

import { type CampaignSetupProgress } from "@/constants/onboarding"
import type { db } from "@/server/db"
import { campaignsProgress } from "@/server/db/schema"

export const campaignsProgressSetSetupProgress = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    campaignId: string
    key: keyof CampaignSetupProgress
  }
}) => {
  const { campaignId, key } = input

  await database
    .insert(campaignsProgress)
    .values({
      campaignId,
      setupProgress: {
        [key]: true,
      },
    })
    .onConflictDoUpdate({
      target: campaignsProgress.campaignId,
      set: {
        setupProgress: sql`
          coalesce(${campaignsProgress.setupProgress}, '{}'::jsonb)
          || jsonb_build_object(${key}::text, true)
        `,
      },
    })
}
