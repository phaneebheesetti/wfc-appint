import { eq, inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { type CampaignUser, campaignsUsers, participantParentUsers, users } from "@/server/db/schema"

export const campaignsGetCampaignsForParent = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}): Promise<CampaignUser[]> => {
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

  const childUsers = [...directUsers, ...mappedUsers].filter(
    (user, index, self) => index === self.findIndex(u => u.id === user.id)
  )

  if (childUsers.length === 0) {
    return []
  }

  const childUserIds = childUsers.map(user => user.id)

  const campaignsUsersData = await database.query.campaignsUsers.findMany({
    where: inArray(campaignsUsers.userId, childUserIds),
    with: {
      campaign: {
        with: {
          sponsor: true,
          casesTransactions: true,
        },
      },
      organization: true,
      user: true,
    },
  })

  return campaignsUsersData
}
