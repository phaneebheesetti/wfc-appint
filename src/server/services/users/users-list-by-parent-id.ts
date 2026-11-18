import { eq, inArray } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers, participantParentUsers, users } from "@/server/db/schema"

export const usersListByParentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}) => {
  const [directUsers, mappingRows] = await Promise.all([
    database.query.users.findMany({
      where: eq(users.parentUserId, input.parentId),
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    }),
    database.query.participantParentUsers.findMany({
      where: eq(participantParentUsers.parentUserId, input.parentId),
    }),
  ])
  const participantids = mappingRows.map(id => id.participantUserId)

  const mappedUsers = participantids.length
    ? await database.query.users.findMany({
        where: inArray(users.id, participantids),
      })
    : []

  const usersData = [...directUsers, ...mappedUsers].filter(
    (user, index, self) => index === self.findIndex(u => u.id === user.id)
  )
  const userIds = usersData.map(user => user.id)
  const campaignUserData = userIds.length
    ? await database.query.campaignsUsers.findMany({
        where: inArray(campaignsUsers.userId, userIds),
      })
    : []
  const campaignUserIds = new Set(campaignUserData.map(c => c.userId))
  return usersData.filter(user => campaignUserIds.has(user.id))
}
