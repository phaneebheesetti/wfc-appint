import { relations } from "drizzle-orm"
import { index, integer, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"

import { CampaignAnnouncementStatusEnum, CampaignAnnouncementTypeEnum } from "@/constants/campaign-announcements"
import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Campaign, campaigns } from "./campaigns"
import { type Organization, organizations } from "./organizations"
import { type User, users } from "./users"

export const campaignAnnouncementTypeEnum = pgEnum(
  "campaign_announcement_type",
  Object.values(CampaignAnnouncementTypeEnum) as [string, ...string[]]
)
export const campaignAnnouncementStatusEnum = pgEnum(
  "campaign_announcement_status",
  Object.values(CampaignAnnouncementStatusEnum) as [string, ...string[]]
)

export const campaignAnnouncements = pgTable(
  "campaign_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),

    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: campaignAnnouncementTypeEnum("type").notNull(),
    status: campaignAnnouncementStatusEnum("status").notNull().default("delivered"),
    reach: integer("reach").default(0),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("campaign_announcements"),
    // foreign key indexes
    index("idx_campaign_announcements_campaign_id").on(table.campaignId),
    index("idx_campaign_announcements_organization_id").on(table.organizationId),
    index("idx_campaign_announcements_created_by_user_id").on(table.createdByUserId),
    // composite indexes for campaigns
    index("idx_campaign_announcements_campaign_id_title").on(table.campaignId, table.title),
    index("idx_campaign_announcements_campaign_id_type").on(table.campaignId, table.type),
    index("idx_campaign_announcements_campaign_id_status").on(table.campaignId, table.status),
    index("idx_campaign_announcements_campaign_created_at").on(table.campaignId, table.createdAt),
  ]
).enableRLS()

export type CampaignAnnouncement = typeof campaignAnnouncements.$inferSelect & {
  campaign?: Campaign
  organization?: Organization
  createdByUser?: User
}

export type CampaignAnnouncementSelect = typeof campaignAnnouncements.$inferSelect
export type CampaignAnnouncementInsert = typeof campaignAnnouncements.$inferInsert

export const campaignAnnouncementsRelations = relations(campaignAnnouncements, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignAnnouncements.campaignId],
    references: [campaigns.id],
  }),
  organization: one(organizations, {
    fields: [campaignAnnouncements.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [campaignAnnouncements.createdByUserId],
    references: [users.id],
  }),
}))
