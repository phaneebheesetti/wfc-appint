import { sql } from "drizzle-orm"
import { index, pgPolicy, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { rolesEnum } from "./role-permissions"

export const roleSwitchHistory = pgTable(
  "role_switch_history",
  {
    userId: uuid("user_id").notNull(),
    previousRole: rolesEnum("previous_role").notNull(),
    newRole: rolesEnum("new_role").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    pgPolicy("role_switch_history_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('role_switch_history.all'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("role_switch_history_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('role_switch_history.select'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("role_switch_history_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('role_switch_history.insert'::public.app_permission) AS authorize)`,
    }),
    index("idx_role_switch_history_user_id").on(table.userId),
    index("idx_role_switch_history_timestamp").on(table.timestamp),
  ]
).enableRLS()

export type RoleSwitchHistory = typeof roleSwitchHistory.$inferSelect

export type RoleSwitchHistorySelect = typeof roleSwitchHistory.$inferSelect
export type RoleSwitchHistoryInsert = typeof roleSwitchHistory.$inferInsert
