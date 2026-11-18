import { relations, sql } from "drizzle-orm"
import { index, pgPolicy, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { type User, users } from "./users"

export const participantParentUsers = pgTable(
  "participant_parent_mapping",
  {
    parentUserId: uuid("parent_user_id")
      .notNull()
      .references(() => users.id),
    participantUserId: uuid("participant_user_id")
      .notNull()
      .references(() => users.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.parentUserId, table.participantUserId] }),
    pgPolicy("participant_parent_mapping_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('participant_parent_mapping.all'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("participant_parent_mapping_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('participant_parent_mapping.select'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("participant_parent_mapping_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('participant_parent_mapping.insert'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("participant_parent_mapping_delete", {
      as: "permissive",
      to: authenticatedRole,
      for: "delete",
      using: sql`(SELECT public.authorize('participant_parent_mapping.delete'::public.app_permission) AS authorize)`,
    }),
    // foreign key indexes
    index("idx_participant_parent_mapping_parent_user_id").on(table.parentUserId),
    index("idx_participant_parent_mapping_participant_user_id").on(table.participantUserId),
    index("idx_participant_parent_mapping_created_at").on(table.createdAt),
  ]
).enableRLS()

export type ParticipantParentUser = typeof participantParentUsers.$inferSelect & {
  parentUser?: User | null
  participantUser?: User | null
  createdByUser?: User | null
}

export type ParticipantParentUserSelect = typeof participantParentUsers.$inferSelect
export type ParticipantParentUserInsert = typeof participantParentUsers.$inferInsert

export const participantParentUsersRelations = relations(participantParentUsers, ({ one }) => ({
  parentUser: one(users, {
    fields: [participantParentUsers.parentUserId],
    references: [users.id],
    relationName: "parentUser",
  }),
  participantUser: one(users, {
    fields: [participantParentUsers.participantUserId],
    references: [users.id],
    relationName: "participantUser",
  }),
  createdByUser: one(users, {
    fields: [participantParentUsers.createdByUserId],
    references: [users.id],
    relationName: "createdByUser",
  }),
}))
