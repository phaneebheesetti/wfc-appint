import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizationsUsers } from "@/server/db/schema"

export const organizationsUsersGetAllByUserIds = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userIds: string[] }
}) => {
  return database.query.organizationsUsers.findMany({
    where: inArray(organizationsUsers.userId, input.userIds),
    with: {
      user: true,
    },
  })
}
