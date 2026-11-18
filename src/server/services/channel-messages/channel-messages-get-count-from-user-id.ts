import { count, eq, inArray } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { channelMessages, channelsUsers } from "@/server/db/schema"

import { channelsListFromParent } from "../channels"

export const channelMessagesGetCountFromUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; role: RolesEnum }
}) => {
  let channelIds: string[] = []

  if (input.role === RolesEnum.PARENT) {
    const parentChannels = await channelsListFromParent({
      database,
      input: { userId: input.userId, loggedInRole: input.role },
    })

    channelIds = parentChannels?.map(c => c.id) ?? []
  } else {
    const userChannels = await database
      .selectDistinct({ channelId: channelsUsers.channelId })
      .from(channelsUsers)
      .where(eq(channelsUsers.userId, input.userId))

    channelIds = userChannels.map(c => c.channelId)
  }

  // Then get count of all messages in those channels
  return database
    .select({
      count: count(),
      channelId: channelMessages.channelId,
    })
    .from(channelMessages)
    .where(inArray(channelMessages.channelId, channelIds))
    .groupBy(channelMessages.channelId)
}
