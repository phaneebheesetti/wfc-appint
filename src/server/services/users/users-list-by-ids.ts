import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersListByIds = async ({ database, input }: { database: typeof db; input: { ids: string[] } }) => {
  const data = await database.query.users.findMany({
    columns: {
      id: true,
      fullName: true,
    },
    where: inArray(users.id, input.ids),
    orderBy: (users, { asc }) => [asc(users.fullName)],
  })

  return data
}
