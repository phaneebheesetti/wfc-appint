import { type AnyColumn, asc, desc, getTableColumns, sql } from "drizzle-orm"
import { type PgTable } from "drizzle-orm/pg-core"

import { PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import * as schema from "@/server/db/schema"
import { type Pagination } from "@/types/pagination"

interface GetOrderByClauseProps {
  tableName: string
  orderBy?: string
  orderDirection?: "asc" | "desc"
  naturalSorting?: boolean
  nullsLast?: boolean
}

export function getOrderByClause({
  tableName,
  orderBy,
  orderDirection = "asc",
  naturalSorting = false,
  nullsLast = false,
}: GetOrderByClauseProps) {
  if (!tableName || !orderBy) return []

  const table = schema[(tableName ?? orderBy.split("_").pop()) as keyof typeof schema] as PgTable
  if (!table) return []

  const tableColumns = getTableColumns(table)
  const orderByColumn = tableColumns?.[orderBy]
  if (!orderByColumn) return []

  if (naturalSorting) {
    return getNaturalOrderByClause(orderByColumn, orderDirection)
  }

  if (nullsLast) {
    const emptyAsNull = sql`NULLIF(TRIM(${orderByColumn}), '')`

    return [orderDirection === "desc" ? sql`${emptyAsNull} DESC NULLS LAST` : sql`${emptyAsNull} ASC NULLS LAST`]
  }

  if (orderDirection === "desc") {
    return [desc(orderByColumn)]
  }

  return [asc(orderByColumn)]
}

function getNaturalOrderByClause(column: AnyColumn, orderDirection: "asc" | "desc" = "asc") {
  const isNumericExpr = sql`${column} ~ '^\\d+$'`
  const numericValueExpr = sql`CASE WHEN ${column} ~ '^\\d+$' THEN ${column}::integer END`

  if (orderDirection === "desc") {
    return [asc(sql`CASE WHEN ${isNumericExpr} THEN 0 ELSE 1 END`), desc(numericValueExpr), desc(column)]
  }

  return [asc(sql`CASE WHEN ${isNumericExpr} THEN 0 ELSE 1 END`), asc(numericValueExpr), asc(column)]
}

export const getPaginationOffset = (page = PAGINATION_PAGE_DEFAULT, limit = PAGINATION_LIMIT_DEFAULT): number => {
  return (page - 1) * limit
}

interface GetPaginationProps {
  page?: number
  limit?: number
  total?: number
}

export const getPagination = ({
  page = PAGINATION_PAGE_DEFAULT,
  limit = PAGINATION_LIMIT_DEFAULT,
  total = 0,
}: GetPaginationProps): Pagination => {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  }
}
