import { and, eq, isNull, or } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaigns } from "@/server/db/schema"

export const campaignsGetByOrganizationId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; userId: string }
}) => {
  return database.query.campaigns.findMany({
    where: and(
      eq(campaigns.organizationId, input.organizationId),
      or(
        and(eq(campaigns.createdByUserId, input.userId), eq(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)),
        eq(campaigns.visibility, CampaignsVisibilityEnum.PUBLISHED)
      ),
      isNull(campaigns.deletedAt)
    ),
    orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
    with: {
      sponsor: true,
      createdByUser: true,
      organization: {
        with: {
          createdByUser: true,
        },
      },
    },
  })
}
