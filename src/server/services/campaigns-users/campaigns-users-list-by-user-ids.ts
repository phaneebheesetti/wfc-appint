import { inArray } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"

export const campaignsUsersListByUserIds = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userIds: string[] }
}) => {
  return database.query.campaignsUsers.findMany({
    where: inArray(campaignsUsers.userId, input.userIds),
    with: {
      user: {
        with: {
          casesTransactions: true,
          paymentLogs: true,
          parentUser: true,
        },
      },
    },
  })
}
