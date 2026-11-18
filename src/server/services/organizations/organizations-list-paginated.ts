import { and, count, eq, ilike, isNotNull, isNull, ne } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { OrderByDirectionEnum, PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { db } from "@/server/db"
import { type Organization, organizations, users } from "@/server/db/schema"
import { type PaginatedData } from "@/types/pagination"
import { getOrderByClause, getPagination, getPaginationOffset } from "@/utils/database"

export type OrganizationsListPaginatedInput = {
  page?: number
  limit?: number
  search?: string
  searchBy?: "name" | "accountNumber"
  adminUserId?: string
  createdByUserId?: string
  stripeConnectedAccount?: boolean
  orderBy?: string
  orderDirection?: OrderByDirectionEnum
}

export const organizationsListPaginated = async ({
  database,
  input,
}: {
  database: typeof db
  input: OrganizationsListPaginatedInput
}): Promise<PaginatedData<Organization>> => {
  const {
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    search,
    searchBy = "name",
    adminUserId,
    createdByUserId,
    stripeConnectedAccount,
    orderBy = "name",
    orderDirection = OrderByDirectionEnum.ASC,
  } = input
  const offset = getPaginationOffset(page, limit)

  const whereClause = and(
    isNull(organizations.deletedAt),
    // Hide FC-onboarding drafts from all general listings; they're only visible to the owning FC via the onboarding card.
    ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
    search
      ? searchBy === "accountNumber"
        ? ilike(organizations.accountNumber, `${search}%`)
        : ilike(organizations.name, `%${search}%`)
      : undefined,
    adminUserId ? eq(organizations.adminUserId, adminUserId) : undefined,
    createdByUserId ? eq(organizations.createdByUserId, createdByUserId) : undefined,
    stripeConnectedAccount === undefined
      ? undefined
      : stripeConnectedAccount
        ? isNotNull(organizations.stripeConnectedAccountId)
        : isNull(organizations.stripeConnectedAccountId)
  )

  const tableNameMap = {
    adminUser: "users",
    createdByUser: "users",
    default: "organizations",
  }
  const tableName = tableNameMap[orderBy?.split("_")[0] as keyof typeof tableNameMap] ?? tableNameMap.default

  const orderByClause = getOrderByClause({
    tableName,
    orderBy: orderBy.split("_").pop(),
    orderDirection,
    nullsLast: orderBy === "accountNumber",
  })

  const adminUser = alias(users, "adminUser")
  const createdByUser = alias(users, "createdByUser")

  const [[countResult], organizationsResult] = await Promise.all([
    database
      .select({ count: count() })
      .from(organizations)
      .leftJoin(adminUser, eq(organizations.adminUserId, adminUser.id))
      .leftJoin(createdByUser, eq(organizations.createdByUserId, createdByUser.id))
      .where(whereClause),

    database
      .select()
      .from(organizations)
      .leftJoin(adminUser, eq(organizations.adminUserId, adminUser.id))
      .leftJoin(createdByUser, eq(organizations.createdByUserId, createdByUser.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset(offset),
  ])

  const organizationsData: Organization[] = organizationsResult.map(organization => ({
    ...organization.organizations,
    adminUser: organization.adminUser,
    createdByUser: organization.createdByUser ?? undefined,
  }))

  return {
    data: organizationsData,
    pagination: getPagination({ page, limit, total: countResult?.count ?? 0 }),
  }
}
