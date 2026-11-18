import { relations } from "drizzle-orm"
import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const campaignsUsers = pgTable(
  "campaigns_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),

    permissionSlipSignedAt: timestamp("permission_slip_signed_at"),
    requestedCaseTransactionAt: timestamp("requested_case_transaction_at"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("campaigns_users"),
    // foreign key indexes
    uniqueIndex().on(table.campaignId, table.userId),
    index("idx_campaigns_users_campaign_id").on(table.campaignId),
    index("idx_campaigns_users_user_id").on(table.userId),
    index("idx_campaigns_users_organization_id").on(table.organizationId),
    // composite indexes for campaigns, users
    index("idx_campaigns_users_campaign_user_created_at").on(table.campaignId, table.userId, table.createdAt),
  ]
).enableRLS()

export type CampaignUser = typeof campaignsUsers.$inferSelect & {
  campaign?: Campaign
  organization?: Organization
  user?: User
}

export type CampaignUserSelect = typeof campaignsUsers.$inferSelect
export type CampaignUserInsert = typeof campaignsUsers.$inferInsert

export const campaignsUsersRelations = relations(campaignsUsers, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignsUsers.campaignId],
    references: [campaigns.id],
  }),
  organization: one(organizations, {
    fields: [campaignsUsers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [campaignsUsers.userId],
    references: [users.id],
  }),
}))
