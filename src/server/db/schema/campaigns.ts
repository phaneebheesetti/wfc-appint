import { relations } from "drizzle-orm"
import { boolean, index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type CampaignUser, campaignsUsers } from "./campaigns-users"
import { type CasesTransaction, casesTransactions } from "./cases-transactions"
import { type Organization, organizations } from "./organizations"
import { type PaymentLog, paymentLogs } from "./payment-logs"
import { type User, users } from "./users"

export const campaignsStatusEnum = pgEnum(
  "campaigns_status",
  Object.values(CampaignsStatusEnum) as [string, ...string[]]
)

export const campaignsVisibilityEnum = pgEnum(
  "campaigns_visibility",
  Object.values(CampaignsVisibilityEnum) as [string, ...string[]]
)

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => users.id),

    name: varchar("name").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    profitSharePercentage: numeric("profit_share_percentage", { precision: 5, scale: 2, mode: "number" }).notNull(),
    casesGoal: integer("cases_goal").notNull().default(0),
    casesGoalFree: integer("cases_goal_free").notNull().default(0),
    status: campaignsStatusEnum("status").notNull().default(CampaignsStatusEnum.ACTIVE),
    visibility: campaignsVisibilityEnum("visibility").notNull().default(CampaignsVisibilityEnum.PUBLISHED),
    digitalPayment: boolean("digital_payment").notNull().default(false),
    digitalPermissionSlip: boolean("digital_permission_slip").notNull().default(false),
    prizeTemplateSlug: text("prize_template_name"),
    homeRunPrizesTemplate: boolean("home_run_prizes_template").notNull().default(false),
    deletedAt: timestamp("deleted_at"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("campaigns"),
    // foreign key indexes
    index("idx_campaigns_created_by_user_id").on(table.createdByUserId),
    index("idx_campaigns_organization_id").on(table.organizationId),
    index("idx_campaigns_sponsor_id").on(table.sponsorId),
    // single column indexes
    index("idx_campaigns_name").on(table.name),
    index("idx_campaigns_status").on(table.status),
    index("idx_campaigns_visibility").on(table.visibility),
    index("idx_campaigns_start_date").on(table.startDate),
    index("idx_campaigns_end_date").on(table.endDate),
    index("idx_campaigns_created_at").on(table.createdAt),
    index("idx_campaigns_deleted_at").on(table.deletedAt),
    // composite indexes for organizations
    index("idx_campaigns_organization_status").on(table.organizationId, table.status),
  ]
).enableRLS()

export type Campaign = typeof campaigns.$inferSelect & {
  createdByUser?: User
  organization?: Organization
  sponsor?: User
  campaignsUsers?: CampaignUser[]
  paymentLogs?: PaymentLog[]
  casesTransactions?: CasesTransaction[]
}

export type CampaignSelect = typeof campaigns.$inferSelect
export type CampaignInsert = typeof campaigns.$inferInsert

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [campaigns.createdByUserId],
    references: [users.id],
    relationName: "createdByUser",
  }),
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  sponsor: one(users, {
    fields: [campaigns.sponsorId],
    references: [users.id],
    relationName: "sponsor",
  }),
  campaignsUsers: many(campaignsUsers),
  paymentLogs: many(paymentLogs),
  casesTransactions: many(casesTransactions),
}))
