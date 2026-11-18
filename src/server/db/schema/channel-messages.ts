import { relations } from "drizzle-orm"
import { index, jsonb, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core"

import { getDefaultPolicies, timestamps } from "@/server/db/helpers"

import { type Channel, channels } from "./channels"
import { type User, users } from "./users"

export const channelMessages = pgTable(
  "channel_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ablyMessageId: varchar("ably_message_id", { length: 255 }),

    ablyRawMessage: jsonb("ably_raw_message"),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),

    ...timestamps,
  },
  table => [
    ...getDefaultPolicies("channel_messages"),
    // foreign key indexes
    index("idx_channel_messages_channel_id").on(table.channelId),
    index("idx_channel_messages_user_id").on(table.userId),
    // composite indexes for channels
    index("idx_channel_messages_channel_created_at").on(table.channelId, table.createdAt),
    // composite indexes for channels, users
    index("idx_channel_messages_channel_user_created_at").on(table.channelId, table.userId, table.createdAt),
  ]
).enableRLS()

export type ChannelMessage = typeof channelMessages.$inferSelect & {
  channel?: Channel
  user?: User
}

export type ChannelMessageSelect = typeof channelMessages.$inferSelect
export type ChannelMessageInsert = typeof channelMessages.$inferInsert

export const channelMessagesRelations = relations(channelMessages, ({ one }) => ({
  channel: one(channels, {
    fields: [channelMessages.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [channelMessages.userId],
    references: [users.id],
  }),
}))
