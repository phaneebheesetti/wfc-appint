import { and, count, eq, inArray, isNull } from "drizzle-orm"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import type { db } from "@/server/db"
import { campaigns, organizations } from "@/server/db/schema"

export const campaignsClosedCountForSalesRep = async ({
  database,
  userId,
}: {
  database: typeof db
  userId: string
}) => {
  const organizationIdsQuery = database
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(isNull(organizations.deletedAt), eq(organizations.fundraisingConsultantUserId, userId)))

  const [result] = await database
    .select({
      count: count(),
    })
    .from(campaigns)
    .where(
      and(
        isNull(campaigns.deletedAt),
        inArray(campaigns.organizationId, organizationIdsQuery),
        inArray(campaigns.status, [CampaignsStatusEnum.ENDED, CampaignsStatusEnum.CANCELLED])
      )
    )

  return result?.count ?? 0
}
