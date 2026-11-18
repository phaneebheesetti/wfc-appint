import type { db } from "@/server/db"
import { channelMessages } from "@/server/db/schema"

export const channelMessagesCreateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: { channelIds: string[]; content: string; userId: string }
}) => {
  const createdMessages = await database
    .insert(channelMessages)
    .values(
      input.channelIds.map(channelId => ({
        channelId,
        content: input.content,
        userId: input.userId,
        createdAt: new Date(),
      }))
    )
    .returning()

  return createdMessages
}
