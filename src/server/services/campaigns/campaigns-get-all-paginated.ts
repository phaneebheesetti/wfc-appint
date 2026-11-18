import { and, count, eq, ilike, isNull, ne, or } from "drizzle-orm"

import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { OrderByDirectionEnum, PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import type { db } from "@/server/db"
import { type Campaign, campaigns, organizations, users } from "@/server/db/schema"
import { type PaginatedData } from "@/types/pagination"
import { getOrderByClause, getPagination, getPaginationOffset } from "@/utils/database"

export type CampaignsGetAllPaginatedInput = {
  page?: number
  limit?: number
  search?: string
  sponsorId?: string
  status?: string
  orderBy?: string
  orderDirection?: OrderByDirectionEnum
}

export const campaignsGetAllPaginated = async ({
  database,
  input,
}: {
  database: typeof db
  input: CampaignsGetAllPaginatedInput
}): Promise<PaginatedData<Campaign>> => {
  const {
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    search,
    sponsorId,
    status,
    orderBy = "organization_name",
    orderDirection = OrderByDirectionEnum.ASC,
  } = input
  const offset = getPaginationOffset(page, limit)

  const whereClause = and(
    isNull(campaigns.deletedAt),
    ne(campaigns.visibility, CampaignsVisibilityEnum.DRAFT),
    search
      ? or(
          ilike(organizations.name, `%${search}%`),
          ilike(campaigns.name, `%${search}%`),
          or(
            ilike(organizations.street, `%${search}%`),
            ilike(organizations.city, `%${search}%`),
            ilike(organizations.postalCode, `%${search}%`),
            ilike(organizations.state, `%${search}%`),
            ilike(organizations.country, `%${search}%`)
          )
        )
      : undefined,
    sponsorId ? eq(campaigns.sponsorId, sponsorId) : undefined,
    status ? eq(campaigns.status, status) : undefined
  )

  const tableNameMap = {
    organization: "organizations",
    sponsor: "users",
    default: "campaigns",
  }
  const tableName = tableNameMap[orderBy?.split("_")[0] as keyof typeof tableNameMap] ?? tableNameMap.default

  const orderByClause = getOrderByClause({ tableName, orderBy: orderBy.split("_").pop(), orderDirection })

  const [[countResult], campaignsResult] = await Promise.all([
    database
      .select({ count: count() })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .innerJoin(users, eq(campaigns.sponsorId, users.id))
      .where(whereClause),

    database
      .select()
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .innerJoin(users, eq(campaigns.sponsorId, users.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset),
  ])

  const campaignsData: Campaign[] = campaignsResult.map(campaign => ({
    ...campaign.campaigns,
    organization: campaign.organizations,
    sponsor: campaign.users,
  }))

  return {
    data: campaignsData,
    pagination: getPagination({ page, limit, total: countResult?.count ?? 0 }),
  }
}
