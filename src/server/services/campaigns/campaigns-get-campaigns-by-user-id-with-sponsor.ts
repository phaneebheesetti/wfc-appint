import { and, eq, isNull, ne } from "drizzle-orm"

import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaigns } from "@/server/db/schema"

export const campaignsGetCampaignsByUserIdWithSponsor = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; organizationId?: string }
}) => {
  return database.query.campaigns.findMany({
    where: and(
      eq(campaigns.sponsorId, input.userId),
      // Scope to a single org when provided so a member removed from one org doesn't surface (or reassign)
      // their sponsorships in other orgs.
      input.organizationId ? eq(campaigns.organizationId, input.organizationId) : undefined,
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
      // Only an active fundraiser's sponsor is reassignable on member removal
      eq(campaigns.status, CampaignsStatusEnum.ACTIVE)
    ),
    with: {
      sponsor: true,
      organization: true,
    },
  })
}
