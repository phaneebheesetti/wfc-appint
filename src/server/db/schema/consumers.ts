import { sql } from "drizzle-orm"
import { index, pgPolicy, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

export const consumers = pgTable(
  "consumers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    email: varchar("email").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  table => [
    pgPolicy("consumers_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('consumers.all'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumers_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('consumers.select'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumers_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('consumers.insert'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumers_update", {
      as: "permissive",
      to: authenticatedRole,
      for: "update",
      using: sql`(SELECT public.authorize('consumers.update'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("consumers_delete", {
      as: "permissive",
      to: authenticatedRole,
      for: "delete",
      using: sql`(SELECT public.authorize('consumers.delete'::public.app_permission) AS authorize)`,
    }),

    uniqueIndex("uq_consumers_email").on(table.email),

    index("idx_consumers_created_at").on(table.createdAt),
  ]
).enableRLS()

export type Consumer = typeof consumers.$inferSelect

export type ConsumerSelect = typeof consumers.$inferSelect

export type ConsumerInsert = typeof consumers.$inferInsert
