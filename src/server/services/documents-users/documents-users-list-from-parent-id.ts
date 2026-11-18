import { and, eq, inArray, isNotNull } from "drizzle-orm"

import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import type { db } from "@/server/db"
import { documentsUsers, participantParentUsers, users } from "@/server/db/schema"

export const documentsUsersListFromParentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string; status: string }
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

  const childUsers = [...directUsers, ...mappedUsers].filter(
    (user, index, self) => index === self.findIndex(u => u.id === user.id)
  )

  if (childUsers.length === 0) {
    return []
  }

  const childUserIds = childUsers.map(user => user.id)

  const documentsUsersData = await database.query.documentsUsers.findMany({
    where: and(
      inArray(documentsUsers.userId, childUserIds),
      eq(documentsUsers.status, input.status),
      input.status === DocumentsUsersStatusEnum.PENDING ? isNotNull(documentsUsers.sentEmailAt) : undefined
    ),
    with: {
      document: {
        with: {
          organization: true,
          campaign: true,
          event: true,
        },
      },
      user: true,
    },
  })

  return documentsUsersData
}
