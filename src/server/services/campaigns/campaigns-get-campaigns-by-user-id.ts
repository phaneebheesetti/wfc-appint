import { and, eq, inArray, isNull, ne, not, or } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { campaigns, organizations, organizationsUsers } from "@/server/db/schema"

export const campaignsGetCampaignsByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; role?: RolesEnum }
}) => {
  const { userId, role } = input

  const orgUsers = await database.query.organizationsUsers.findMany({
    where: eq(organizationsUsers.userId, userId),
  })
  const orgsCreatedByUser = await database.query.organizations.findMany({
    where:
      role === RolesEnum.SALES_REPRESENTATIVE
        ? or(
            and(
              not(isNull(organizations.fundraisingConsultantUserId)),
              eq(organizations.fundraisingConsultantUserId, userId)
            ),
            and(isNull(organizations.fundraisingConsultantUserId), eq(organizations.createdByUserId, userId))
          )
        : eq(organizations.createdByUserId, userId),
  })

  const organizationIds = [...orgsCreatedByUser.map(org => org.id), ...orgUsers.map(org => org.organizationId)]

  return database.query.campaigns.findMany({
    where: and(
      inArray(campaigns.organizationId, organizationIds),
      isNull(campaigns.deletedAt),
      ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)
    ),
    with: {
      sponsor: true,
      organization: true,
      casesTransactions: true,
    },
    orderBy: (campaigns, { desc }) => [desc(campaigns.createdAt)],
  })
}
