import { eq, inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { casesTransactions, participantParentUsers, users } from "@/server/db/schema"

export const casesTransactionsGetAllFromParentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}) => {
  // First, find all child users where parentUserId matches the parentId

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

  // If no children found, return empty array
  if (childUsers.length === 0) {
    return []
  }

  // Extract child user IDs and filter out any potential null values
  const childUserIds = childUsers.map(child => child.id).filter(Boolean)

  // If no valid child user IDs, return empty array
  if (childUserIds.length === 0) {
    return []
  }

  // Fetch all cases transactions for the child users
  const casesTransactionsData = await database.query.casesTransactions.findMany({
    where: inArray(casesTransactions.userId, childUserIds),
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
    with: {
      user: {
        with: {
          paymentLogs: true,
        },
      },
      campaign: true,
    },
  })

  return casesTransactionsData
}
