import { relations } from "drizzle-orm"
import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Channel, channels } from "./channels"
import { type User, users } from "./users"

export const channelsUsers = pgTable(
  "channels_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("channels_users"),
    // foreign key indexes
    uniqueIndex().on(table.channelId, table.userId),
    index("idx_channels_users_channel_id").on(table.channelId),
    index("idx_channels_users_user_id").on(table.userId),
    // composite indexes for channels, users
    index("idx_channels_users_channel_user_created_at").on(table.channelId, table.userId, table.createdAt),
  ]
).enableRLS()

export type ChannelUser = typeof channelsUsers.$inferSelect & {
  channel?: Channel
  user?: User
}

export type ChannelUserSelect = typeof channelsUsers.$inferSelect
export type ChannelUserInsert = typeof channelsUsers.$inferInsert

export const channelsUsersRelations = relations(channelsUsers, ({ one }) => ({
  channel: one(channels, {
    fields: [channelsUsers.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelsUsers.userId],
    references: [users.id],
  }),
}))
