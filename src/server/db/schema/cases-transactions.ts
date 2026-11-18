import { relations } from "drizzle-orm"
import { index, integer, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const casesTransactionsTypeEnum = pgEnum(
  "cases_transactions_type",
  Object.values(CasesTransactionsTypeEnum) as [string, ...string[]]
)

export const casesTransactions = pgTable(
  "cases_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentTransactionId: uuid("parent_transaction_id"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    userId: uuid("user_id").references(() => users.id),

    type: casesTransactionsTypeEnum("type").notNull(),
    note: text("note"),
    quantity: integer("quantity").notNull().default(0),

    pricePerCaseCents: integer("price_per_case_cents").default(0),
    totalPriceCents: integer("total_price_cents").default(0),

    profitPerCaseCents: integer("profit_per_case_cents").default(0),
    totalProfitCents: integer("total_profit_cents").default(0),

    costPerCaseCents: integer("cost_per_case_cents").default(0),
    totalCostCents: integer("total_cost_cents").default(0),

    pricePerBarCents: integer("price_per_bar_cents").default(0),
    barsPerCase: integer("bars_per_case").default(0),

    shippingCostCents: integer("shipping_cost_cents").default(0),

    sfOrderId: varchar("sf_order_id"),
    sfProductName: varchar("sf_product_name"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("cases_transactions"),
    // foreign key indexes
    index("idx_cases_transactions_parent_transaction_id").on(table.parentTransactionId),
    index("idx_cases_transactions_created_by_user_id").on(table.createdByUserId),
    index("idx_cases_transactions_organization_id").on(table.organizationId),
    index("idx_cases_transactions_campaign_id").on(table.campaignId),
    index("idx_cases_transactions_user_id").on(table.userId),
    // composite indexes for campaigns
    index("idx_cases_transactions_campaign_type").on(table.campaignId, table.type),
    index("idx_cases_transactions_campaign_user_id").on(table.campaignId, table.userId),
    index("idx_cases_transactions_campaign_created_at").on(table.campaignId, table.createdAt),
    // composite indexes for users
    index("idx_cases_transactions_user_type").on(table.userId, table.type),
    index("idx_cases_transactions_user_created_at").on(table.userId, table.createdAt),
    // composite indexes for campaigns, users
    index("idx_cases_transactions_campaign_user_type").on(table.campaignId, table.userId, table.type),
    index("idx_cases_transactions_campaign_user_created_at").on(table.campaignId, table.userId, table.createdAt),
    // composite indexes for organizations
    index("idx_cases_transactions_organization_created_at").on(table.organizationId, table.createdAt),
  ]
).enableRLS()

export type CasesTransaction = typeof casesTransactions.$inferSelect & {
  createdByUser?: User
  organization?: Organization
  campaign?: Campaign | null
  user?: User | null
  parentTransaction?: CasesTransaction | null
  childTransactions?: CasesTransaction[]
}

export type CasesTransactionSelect = typeof casesTransactions.$inferSelect
export type CasesTransactionInsert = typeof casesTransactions.$inferInsert

export const casesTransactionsRelations = relations(casesTransactions, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [casesTransactions.createdByUserId],
    references: [users.id],
    relationName: "createdByUser",
  }),
  organization: one(organizations, {
    fields: [casesTransactions.organizationId],
    references: [organizations.id],
  }),
  campaign: one(campaigns, {
    fields: [casesTransactions.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [casesTransactions.userId],
    references: [users.id],
    relationName: "user",
  }),
  parentTransaction: one(casesTransactions, {
    fields: [casesTransactions.parentTransactionId],
    references: [casesTransactions.id],
    relationName: "parentChild",
  }),
  childTransactions: many(casesTransactions, {
    relationName: "parentChild",
  }),
}))
