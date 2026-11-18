import { eq, inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { channels, channelsUsers } from "@/server/db/schema"

export const channelsListByUsersIds = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userIds: string[] }
}) => {
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
    .where(inArray(channelsUsers.userId, input.userIds))
    .groupBy(channels.id)
}
