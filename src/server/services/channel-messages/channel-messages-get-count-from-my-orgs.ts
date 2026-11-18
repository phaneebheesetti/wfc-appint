import { count, eq, inArray, or } from "drizzle-orm"

import type { db } from "@/server/db"
import { channelMessages, channels, channelsUsers } from "@/server/db/schema"

import { organizationsGetAllFromUserId } from "../organizations"

export const channelMessagesGetCountFromMyOrgs = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  // Get all organizations (member of or created)
  const orgs = await organizationsGetAllFromUserId({
    database,
    input: { userId: input.userId },
  })
  const orgIds = orgs.map(org => org.id)

  // Get all channels from these organizations OR where user is directly added
  const orgChannelIds = await database
    .select({ id: channels.id })
    .from(channels)
    .where(
      or(
        inArray(channels.organizationId, orgIds),
        inArray(
          channels.id,
          database
            .select({ channelId: channelsUsers.channelId })
            .from(channelsUsers)
            .where(eq(channelsUsers.userId, input.userId))
        )
      )
    )

  const channelMessagesCount = await database
    .select({
      count: count(),
      channelId: channelMessages.channelId,
    })
    .from(channelMessages)
    .where(
      inArray(
        channelMessages.channelId,
        orgChannelIds.map(c => c.id)
      )
    )
    .groupBy(channelMessages.channelId)

  return channelMessagesCount
}
