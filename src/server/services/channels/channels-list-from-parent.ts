import { eq, inArray } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { channels, channelsUsers } from "@/server/db/schema"

import { usersListByParentId } from "../users"

export const channelsListFromParent = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; loggedInRole: RolesEnum }
}) => {
  if (input.loggedInRole !== RolesEnum.PARENT) {
    return null
  }

  const childUsers = await usersListByParentId({
    database,
    input: { parentId: input.userId },
  })

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
    .where(
      inArray(
        channelsUsers.userId,
        childUsers.map(user => user.id)
      )
    )
}
