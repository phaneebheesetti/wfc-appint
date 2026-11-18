import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { channels, channelsUsers } from "@/server/db/schema"

export const channelsListByUserId = async ({ database, input }: { database: typeof db; input: { userId: string } }) => {
  return await database
    .select({
      id: channels.id,
      name: channels.name,
      organizationId: channels.organizationId,
      createdAt: channels.createdAt,
      updatedAt: channels.updatedAt,
    })
    .from(channels)
    .innerJoin(channelsUsers, eq(channels.id, channelsUsers.channelId))
    .where(eq(channelsUsers.userId, input.userId))
}
