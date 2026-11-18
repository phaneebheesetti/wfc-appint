import { eq, inArray, or } from "drizzle-orm"

import type { db } from "@/server/db"
import { channels, channelsUsers } from "@/server/db/schema"
import { organizationsGetAllFromUserId } from "@/server/services/organizations"

export const channelsListFromMyOrgs = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const orgs = await organizationsGetAllFromUserId({
    database,
    input: { userId: input.userId },
  })
  const orgIds = orgs.map(org => org.id)

  // Get all channels from these organizations OR where user is directly added
  return database
    .select()
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
}
