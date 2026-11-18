import { relations } from "drizzle-orm"
import { boolean, index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

import { type FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { getDefaultPolicies } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type User, users } from "./users"

export type AccessSlot = {
  expiry_date: string | null
  granted_at: string | null
  granted_by: string | null
  revoked_at: string | null
  revoked_by: string | null
  reason_for_revoking: FcAccessRevocationReasonEnum | null
  // Length of this slot's window (4 for an initial grant, 2 for extensions / post-reset cycles).
  duration_weeks?: number | null
  // Set once the approaching-expiry reminder email has been sent.
  reminder_sent_at?: string | null
  // Set once the auto-expiry email has been sent.
  expiry_notified_at?: string | null
}

export type AccessDetails = {
  "1"?: AccessSlot
  "2"?: AccessSlot
  "3"?: AccessSlot
}

export type ResetDetails = {
  timestamp: string
  reset_by: string
  reason: string
} | null

export const participantNamesAccess = pgTable(
  "participant_names_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),

    fundraiserUserId: uuid("fundraiser_user_id")
      .notNull()
      .references(() => users.id),

    isActive: boolean("is_active").notNull().default(true),

    accessDetails: jsonb("access_details").$type<AccessDetails>().notNull().default({}),

    resetDetails: jsonb("reset_details").$type<ResetDetails>().default(null),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    ...getDefaultPolicies("participant_names_access"),
    index("idx_participant_names_access_campaign_id").on(table.campaignId),
  ]
).enableRLS()

export type ParticipantNamesAccess = typeof participantNamesAccess.$inferSelect & {
  campaign?: Campaign | null
  fundraiserUser?: User | null
}

export type ParticipantNamesAccessSelect = typeof participantNamesAccess.$inferSelect
export type ParticipantNamesAccessInsert = typeof participantNamesAccess.$inferInsert

export const participantNamesAccessRelations = relations(participantNamesAccess, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [participantNamesAccess.campaignId],
    references: [campaigns.id],
  }),
  fundraiserUser: one(users, {
    fields: [participantNamesAccess.fundraiserUserId],
    references: [users.id],
  }),
}))
