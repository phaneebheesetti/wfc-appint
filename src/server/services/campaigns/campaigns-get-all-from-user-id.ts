import { and, eq, inArray, isNull, ne, not, or } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { type Organization, campaignsUsers, organizations, organizationsUsers } from "@/server/db/schema"

export const campaignsGetAllFromUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; role?: RolesEnum }
}): Promise<Organization[]> => {
  const { userId, role } = input

  const userMatchClause =
    role === RolesEnum.SALES_REPRESENTATIVE
      ? or(
          and(
            not(isNull(organizations.fundraisingConsultantUserId)),
            eq(organizations.fundraisingConsultantUserId, userId)
          ),
          and(isNull(organizations.fundraisingConsultantUserId), eq(organizations.createdByUserId, userId))
        )
      : or(
          eq(organizations.createdByUserId, userId),
          eq(organizations.adminUserId, userId),
          inArray(
            organizations.id,
            database
              .select({ organizationId: organizationsUsers.organizationId })
              .from(organizationsUsers)
              .where(eq(organizationsUsers.userId, userId))
          ),
          inArray(
            organizations.id,
            database
              .select({ organizationId: campaignsUsers.organizationId })
              .from(campaignsUsers)
              .where(eq(campaignsUsers.userId, userId))
          )
        )

  const whereClause = and(
    isNull(organizations.deletedAt),
    // Hide FC-onboarding draft orgs from the left-nav fundraiser tree.
    ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
    userMatchClause
  )

  const organizationsData = await database.query.organizations.findMany({
    where: whereClause,
    orderBy: (organizations, { asc }) => [asc(organizations.name)],
    with: {
      campaigns: {
        // Draft campaigns are still being set up in onboarding — keep them out of the nav too.
        where: (campaigns, { and, isNull, ne }) =>
          and(isNull(campaigns.deletedAt), ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT)),
      },
    },
  })

  return organizationsData
}
