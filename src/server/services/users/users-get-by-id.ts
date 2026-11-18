import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersGetById = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const user = await database.query.users.findFirst({
    where: eq(users.id, input.id),
  })

  return user ?? null
}
