import { z } from "zod"

export enum OrderByDirectionEnum {
  ASC = "asc",
  DESC = "desc",
}

export const ORDER_BY_SCHEMA = z.object({
  orderBy: z.string().optional(),
  orderDirection: z
    .enum([OrderByDirectionEnum.ASC, OrderByDirectionEnum.DESC])
    .optional()
    .default(OrderByDirectionEnum.ASC),
})

export const PAGINATION_PAGE_DEFAULT = 1
export const PAGINATION_LIMIT_DEFAULT = 10
export const PAGINATION_LIMIT_MAX = 50

export const PAGINATION_SCHEMA = z.object({
  page: z
    .number()
    .transform(val => Math.max(1, val))
    .default(PAGINATION_PAGE_DEFAULT)
    .optional(),
  limit: z
    .number()
    .transform(val => Math.max(1, Math.min(PAGINATION_LIMIT_MAX, val)))
    .default(PAGINATION_LIMIT_DEFAULT)
    .optional(),
})

export const PAGINATION_AND_ORDER_BY_SCHEMA = PAGINATION_SCHEMA.merge(ORDER_BY_SCHEMA)
