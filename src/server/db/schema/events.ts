import { relations } from "drizzle-orm"
import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { EventGoalTypeEnum } from "@/constants/events"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Organization, organizations } from "./organizations"
import { type Prize, prizes } from "./prizes"

export const eventGoalTypeEnum = pgEnum("event_goal_types", Object.values(EventGoalTypeEnum) as [string, ...string[]])

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    prizeId: uuid("prize_id").references(() => prizes.id),

    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    date: timestamp("date", { withTimezone: true }),

    street: varchar("street"),
    city: varchar("city"),
    postalCode: varchar("postal_code"),
    state: varchar("state"),
    country: varchar("country").default("US"),

    casesGoal: integer("cases_goal"),
    goalType: eventGoalTypeEnum("goal_type").notNull().default(EventGoalTypeEnum.ALL_PARTICIPANTS),

    active: boolean("active").notNull().default(true),
    isOnlineEvent: boolean("is_online_event").notNull().default(false),
    onlineEventUrl: text("online_event_url"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("events"),
    // foreign key indexes
    index("idx_events_campaign_id").on(table.campaignId),
    index("idx_events_organization_id").on(table.organizationId),
    index("idx_events_prize_id").on(table.prizeId),
    // composite indexes for campaigns
    index("idx_events_campaign_name").on(table.campaignId, table.name),
    index("idx_events_campaign_date").on(table.campaignId, table.date),
    index("idx_events_campaign_cases_goal").on(table.campaignId, table.casesGoal),
    index("idx_events_campaign_goal_type").on(table.campaignId, table.goalType),
    index("idx_events_campaign_active").on(table.campaignId, table.active),
    index("idx_events_campaign_created_at").on(table.campaignId, table.createdAt),
  ]
).enableRLS()

export type Event = typeof events.$inferSelect & {
  campaign?: Campaign
  organization?: Organization
  prize?: Prize | null
}

export type EventSelect = typeof events.$inferSelect
export type EventInsert = typeof events.$inferInsert

export const eventsRelations = relations(events, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [events.campaignId],
    references: [campaigns.id],
  }),
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  prize: one(prizes, {
    fields: [events.prizeId],
    references: [prizes.id],
  }),
}))
