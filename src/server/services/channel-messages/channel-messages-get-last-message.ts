import { desc, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { channelMessages } from "@/server/db/schema"

export const channelMessagesGetLastMessage = async ({
  database,
  input,
}: {
  database: typeof db
  input: { channelId: string }
}) => {
  const lastMessage = await database.query.channelMessages.findFirst({
    where: eq(channelMessages.channelId, input.channelId),
    orderBy: desc(channelMessages.createdAt),
  })

  return lastMessage ?? null
}
