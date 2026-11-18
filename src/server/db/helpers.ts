import { sql } from "drizzle-orm"
import { customType, pgPolicy, timestamp } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

export const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea"
  },
})

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
}

export const getDefaultPolicies = (tableName: string) => [
  pgPolicy(`${tableName}_all`, {
    as: "permissive",
    to: authenticatedRole,
    for: "all",
    using: sql`(SELECT public.authorize('${sql.raw(tableName)}.all'::public.app_permission) AS authorize)`,
  }),
  pgPolicy(`${tableName}_select`, {
    as: "permissive",
    to: authenticatedRole,
    for: "select",
    using: sql`(SELECT public.authorize('${sql.raw(tableName)}.select'::public.app_permission) AS authorize)`,
  }),
  pgPolicy(`${tableName}_insert`, {
    as: "permissive",
    to: authenticatedRole,
    for: "insert",
    withCheck: sql`(SELECT public.authorize('${sql.raw(tableName)}.insert'::public.app_permission) AS authorize)`,
  }),
  pgPolicy(`${tableName}_update`, {
    as: "permissive",
    to: authenticatedRole,
    for: "update",
    using: sql`(SELECT public.authorize('${sql.raw(tableName)}.update'::public.app_permission) AS authorize)`,
  }),
  pgPolicy(`${tableName}_delete`, {
    as: "permissive",
    to: authenticatedRole,
    for: "delete",
    using: sql`(SELECT public.authorize('${sql.raw(tableName)}.delete'::public.app_permission) AS authorize)`,
  }),
]
