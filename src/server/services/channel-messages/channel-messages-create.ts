import type { db } from "@/server/db"
import { type ChannelMessageInsert, channelMessages } from "@/server/db/schema"

export const channelMessagesCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: ChannelMessageInsert
}) => {
  const [createdMessage] = await database.insert(channelMessages).values(input).returning()

  return createdMessage
}
