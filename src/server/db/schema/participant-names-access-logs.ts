import { sql } from "drizzle-orm"
import { index, pgEnum, pgPolicy, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"
import { authenticatedRole } from "drizzle-orm/supabase"

import { rolesEnum } from "./role-permissions"

export const participantNamesAccessEventTypeEnum = pgEnum("participant_names_access_event_type", [
  "VIEW_PARTICIPANT_NAMES",
  "DOWNLOAD_REPORT",
])

export const participantNamesAccessFileTypeEnum = pgEnum("participant_names_access_file_type", ["CSV", "EXCEL"])

export const participantNamesAccessLogs = pgTable(
  "participant_names_access_logs",
  {
    userId: uuid("user_id").notNull(),
    userRole: rolesEnum("user_role").notNull(),
    campaignId: uuid("campaign_id").notNull(),

    eventType: participantNamesAccessEventTypeEnum("event_type").notNull(),
    reportName: varchar("report_name", { length: 255 }),
    fileType: participantNamesAccessFileTypeEnum("file_type"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    pgPolicy("participant_names_access_logs_all", {
      as: "permissive",
      to: authenticatedRole,
      for: "all",
      using: sql`(SELECT public.authorize('participant_names_access_logs.all'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("participant_names_access_logs_select", {
      as: "permissive",
      to: authenticatedRole,
      for: "select",
      using: sql`(SELECT public.authorize('participant_names_access_logs.select'::public.app_permission) AS authorize)`,
    }),
    pgPolicy("participant_names_access_logs_insert", {
      as: "permissive",
      to: authenticatedRole,
      for: "insert",
      withCheck: sql`(SELECT public.authorize('participant_names_access_logs.insert'::public.app_permission) AS authorize)`,
    }),
    index("idx_participant_names_access_logs_user_id").on(table.userId),
    index("idx_participant_names_access_logs_campaign_id").on(table.campaignId),
    index("idx_participant_names_access_logs_event_type").on(table.eventType),
    index("idx_participant_names_access_logs_created_at").on(table.createdAt),
  ]
).enableRLS()

export type ParticipantNamesAccessLog = typeof participantNamesAccessLogs.$inferSelect

export type ParticipantNamesAccessLogSelect = typeof participantNamesAccessLogs.$inferSelect

export type ParticipantNamesAccessLogInsert = typeof participantNamesAccessLogs.$inferInsert
