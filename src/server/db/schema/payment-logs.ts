import { relations } from "drizzle-orm"
import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { PaymentLogsStatusEnum, PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Consumer, consumers } from "./consumers"
import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const paymentLogsTypeEnum = pgEnum(
  "payment_logs_type",
  Object.values(PaymentLogsTypeEnum) as [string, ...string[]]
)

export const paymentLogsStatusEnum = pgEnum(
  "payment_logs_status",
  Object.values(PaymentLogsStatusEnum) as [string, ...string[]]
)

export const paymentLogs = pgTable(
  "payment_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    userId: uuid("user_id").references(() => users.id),
    consumerId: uuid("consumer_id").references(() => consumers.id),

    type: paymentLogsTypeEnum("type").notNull(),
    status: paymentLogsStatusEnum("status").notNull().default(PaymentLogsStatusEnum.PENDING),

    amountCents: integer("amount_cents").notNull(),
    feeCents: integer("fee_cents").notNull().default(0),
    transactionId: varchar("transaction_id").unique(),
    description: varchar("description"),

    deletedAt: timestamp("deleted_at"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("payment_logs"),
    // foreign key indexes
    index("idx_payment_logs_created_by_user_id").on(table.createdByUserId),
    index("idx_payment_logs_organization_id").on(table.organizationId),
    index("idx_payment_logs_campaign_id").on(table.campaignId),
    index("idx_payment_logs_user_id").on(table.userId),
    // single column indexes
    index("idx_payment_logs_status").on(table.status),
    index("idx_payment_logs_deleted_at").on(table.deletedAt),
    // composite indexes for campaigns
    index("idx_payment_logs_campaign_type").on(table.campaignId, table.type),
    index("idx_payment_logs_campaign_status").on(table.campaignId, table.status),
    index("idx_payment_logs_campaign_user_id").on(table.campaignId, table.userId),
    index("idx_payment_logs_campaign_created_at").on(table.campaignId, table.createdAt),
    // composite indexes for users
    index("idx_payment_logs_user_type").on(table.userId, table.type),
    index("idx_payment_logs_user_status").on(table.userId, table.status),
    index("idx_payment_logs_user_created_at").on(table.userId, table.createdAt),
    // composite indexes for campaigns, users
    index("idx_payment_logs_campaign_user_type").on(table.campaignId, table.userId, table.type),
    index("idx_payment_logs_campaign_user_status").on(table.campaignId, table.userId, table.status),
    index("idx_payment_logs_campaign_user_created_at").on(table.campaignId, table.userId, table.createdAt),
  ]
).enableRLS()

export type PaymentLog = typeof paymentLogs.$inferSelect & {
  createdByUser?: User
  organization?: Organization
  campaign?: Campaign | null
  user?: User | null
  consumer?: Consumer | null
}

export type PaymentLogSelect = typeof paymentLogs.$inferSelect
export type PaymentLogInsert = typeof paymentLogs.$inferInsert

export const paymentLogsRelations = relations(paymentLogs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [paymentLogs.createdByUserId],
    references: [users.id],
    relationName: "createdByUser",
  }),
  organization: one(organizations, {
    fields: [paymentLogs.organizationId],
    references: [organizations.id],
  }),
  campaign: one(campaigns, {
    fields: [paymentLogs.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [paymentLogs.userId],
    references: [users.id],
    relationName: "user",
  }),

  consumer: one(consumers, {
    fields: [paymentLogs.consumerId],
    references: [consumers.id],
  }),
}))
