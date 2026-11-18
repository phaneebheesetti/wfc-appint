import { and, eq, isNull, ne } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaigns } from "@/server/db/schema"

export const campaignsGetByCreatedByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  return database.query.campaigns.findMany({
    where: and(
      eq(campaigns.createdByUserId, input.userId),
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)
    ),
    orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
    with: {
      organization: true,
    },
  })
}
