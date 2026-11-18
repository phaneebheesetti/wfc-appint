import { relations } from "drizzle-orm"
import { type AnyPgColumn, boolean, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { PrizeGoalTypeEnum } from "@/constants/prize"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Organization, organizations } from "./organizations"

export const goalTypeEnum = pgEnum("prize_levels", Object.values(PrizeGoalTypeEnum) as [string, ...string[]])

export const prizes = pgTable(
  "prizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    // AnyPgColumn Type is used for self referencing columns to work with drizzle
    previousPrizeId: uuid("previous_prize_id").references((): AnyPgColumn => prizes.id),
    nextPrizeId: uuid("next_prize_id").references((): AnyPgColumn => prizes.id),

    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    active: boolean("active").notNull().default(true),

    casesGoal: integer("cases_goal"),
    goalType: goalTypeEnum("goal_type").notNull().default(PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT),

    prizeTemplateSlug: text("prize_template_name"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("prizes"),
    // foreign key indexes
    index("idx_prizes_campaign_id").on(table.campaignId),
    index("idx_prizes_organization_id").on(table.organizationId),
    index("idx_prizes_previous_prize_id").on(table.previousPrizeId),
    index("idx_prizes_next_prize_id").on(table.nextPrizeId),
    // composite indexes for campaigns
    index("idx_prizes_campaign_name").on(table.campaignId, table.name),
    index("idx_prizes_campaign_active").on(table.campaignId, table.active),
    index("idx_prizes_campaign_cases_goal").on(table.campaignId, table.casesGoal),
    index("idx_prizes_campaign_goal_type").on(table.campaignId, table.goalType),
    index("idx_prizes_campaign_created_at").on(table.campaignId, table.createdAt),
    index("idx_prizes_campaign_prize_template_slug").on(table.campaignId, table.prizeTemplateSlug),
  ]
).enableRLS()

export type Prize = typeof prizes.$inferSelect & {
  campaign?: Campaign
  organization?: Organization
  previousPrize?: Prize | null
  nextPrize?: Prize | null
}

export type PrizeSelect = typeof prizes.$inferSelect
export type PrizeInsert = typeof prizes.$inferInsert

export const prizesRelations = relations(prizes, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [prizes.campaignId],
    references: [campaigns.id],
  }),
  organization: one(organizations, {
    fields: [prizes.organizationId],
    references: [organizations.id],
  }),
  previousPrize: one(prizes, {
    fields: [prizes.previousPrizeId],
    references: [prizes.id],
    relationName: "previousPrize",
  }),
  nextPrize: one(prizes, {
    fields: [prizes.nextPrizeId],
    references: [prizes.id],
    relationName: "nextPrize",
  }),
}))
