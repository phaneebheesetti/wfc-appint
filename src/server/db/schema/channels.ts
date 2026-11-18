import { relations } from "drizzle-orm"
import { index, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type ChannelMessage, channelMessages } from "./channel-messages"
import { type ChannelUser, channelsUsers } from "./channels-users"
import { type Organization, organizations } from "./organizations"

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id),

    name: varchar("name", { length: 255 }).notNull(),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("channels"),
    // foreign key indexes
    index("idx_channels_organization_id").on(table.organizationId),
    // composite indexes for organizations
    index("idx_channels_organization_name").on(table.organizationId, table.name),
    index("idx_channels_organization_created_at").on(table.organizationId, table.createdAt),
  ]
).enableRLS()

export type Channel = typeof channels.$inferSelect & {
  organization?: Organization
  messages?: ChannelMessage[]
  users?: ChannelUser[]
}

export type ChannelSelect = typeof channels.$inferSelect
export type ChannelInsert = typeof channels.$inferInsert

export const channelsRelations = relations(channels, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [channels.organizationId],
    references: [organizations.id],
  }),
  messages: many(channelMessages),
  users: many(channelsUsers),
}))
