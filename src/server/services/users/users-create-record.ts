import type { db } from "@/server/db"
import { type UserInsert, users } from "@/server/db/schema"
import { normalizeUserInsert } from "@/utils/users"

export const usersCreateRecord = async ({ database, input }: { database: typeof db; input: UserInsert }) => {
  const normalizedInput = normalizeUserInsert(input)

  const [createdUser] = await database.insert(users).values(normalizedInput).returning()
  if (!createdUser) throw new Error("User not created")

  return createdUser
}
