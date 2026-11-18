import { and, eq, inArray, isNull } from "drizzle-orm"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { participantParentUsers, users } from "@/server/db/schema"

export const paymentLogsListByParentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { parentId: string }
}) => {
  // First, get all child users for this parent

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

  // Get all payment logs for these child users
  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: (paymentLogs, { inArray }) =>
      and(
        inArray(paymentLogs.userId, childUserIds),
        eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
        isNull(paymentLogs.deletedAt)
      ),
    with: {
      user: true,
    },
    orderBy: (paymentLogs, { desc }) => [desc(paymentLogs.createdAt)],
  })

  return paymentLogsData
}
