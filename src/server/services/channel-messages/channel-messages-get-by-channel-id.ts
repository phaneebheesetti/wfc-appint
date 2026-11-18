import { asc, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { channelMessages } from "@/server/db/schema"

export const channelMessagesGetByChannelId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { channelId: string }
}) => {
  const messages = await database.query.channelMessages.findMany({
    where: eq(channelMessages.channelId, input.channelId),
    orderBy: asc(channelMessages.createdAt),
    with: {
      user: true,
    },
  })

  return messages
}
