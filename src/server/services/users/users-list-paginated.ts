import { and, count, eq, ilike, isNull, notInArray, or } from "drizzle-orm"

import { OrderByDirectionEnum, PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { type User, users } from "@/server/db/schema"
import { type PaginatedData } from "@/types/pagination"
import { getOrderByClause } from "@/utils/database"
import { getPagination, getPaginationOffset } from "@/utils/database"

export type UsersListPaginatedInput = {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
  orderBy?: string
  orderDirection?: OrderByDirectionEnum
}

export const usersListPaginated = async ({
  database,
  input,
}: {
  database: typeof db
  input: UsersListPaginatedInput
}): Promise<PaginatedData<User>> => {
  const {
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    search,
    role,
    status,
    orderBy = "fullName",
    orderDirection = OrderByDirectionEnum.ASC,
  } = input
  const offset = getPaginationOffset(page, limit)

  const whereClause = and(
    status !== UsersStatusEnum.DELETED ? isNull(users.deletedAt) : undefined,
    notInArray(users.role, [RolesEnum.PARTICIPANT, RolesEnum.PARENT, RolesEnum.USER]),
    search ? or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`)) : undefined,
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined
  )

  const [[countResult], usersData] = await Promise.all([
    database.select({ count: count() }).from(users).where(whereClause),
    database.query.users.findMany({
      where: whereClause,
      with: {
        invitedByUser: true,
      },
      limit,
      offset,
      orderBy: getOrderByClause({ tableName: "users", orderBy, orderDirection }),
    }),
  ])

  return {
    data: usersData,
    pagination: getPagination({ page, limit, total: countResult?.count ?? 0 }),
  }
}
