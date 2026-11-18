import { and, count, eq, ilike, inArray, isNotNull, isNull, ne, not, or } from "drizzle-orm"

import { OrderByDirectionEnum, PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { type Organization, campaignsUsers, organizations, organizationsUsers } from "@/server/db/schema"
import { type PaginatedData } from "@/types/pagination"
import { getOrderByClause, getPagination, getPaginationOffset } from "@/utils/database"

export type OrganizationsListPaginatedFromUserIdInput = {
  userId: string
  role?: RolesEnum
  page?: number
  limit?: number
  search?: string
  searchBy?: "name" | "accountNumber"
  adminUserId?: string
  stripeConnectedAccount?: boolean
  orderBy?: string
  orderDirection?: OrderByDirectionEnum
}

export const organizationsListPaginatedFromUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: OrganizationsListPaginatedFromUserIdInput
}): Promise<PaginatedData<Organization>> => {
  const {
    userId,
    role,
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    search,
    searchBy = "name",
    adminUserId,
    stripeConnectedAccount,
    orderBy = "name",
    orderDirection = OrderByDirectionEnum.ASC,
  } = input
  const offset = getPaginationOffset(page, limit)

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
    // Hide FC-onboarding drafts; they're only surfaced through the dedicated onboarding-state query.
    ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
    userMatchClause,
    search
      ? ilike(searchBy === "accountNumber" ? organizations.accountNumber : organizations.name, `%${search}%`)
      : undefined,
    adminUserId ? eq(organizations.adminUserId, adminUserId) : undefined,
    stripeConnectedAccount === undefined
      ? undefined
      : stripeConnectedAccount
        ? isNotNull(organizations.stripeConnectedAccountId)
        : isNull(organizations.stripeConnectedAccountId)
  )

  const orderByClause = getOrderByClause({
    tableName: "organizations",
    orderBy,
    orderDirection,
    nullsLast: orderBy === "accountNumber",
  })

  const [[countResult], organizationsData] = await Promise.all([
    database.select({ count: count() }).from(organizations).where(whereClause),
    database.query.organizations.findMany({
      where: whereClause,
      with: {
        createdByUser: true,
        adminUser: true,
      },
      limit,
      offset,
      orderBy: orderByClause,
    }),
  ])

  return {
    data: organizationsData,
    pagination: getPagination({ page, limit, total: countResult?.count ?? 0 }),
  }
}
