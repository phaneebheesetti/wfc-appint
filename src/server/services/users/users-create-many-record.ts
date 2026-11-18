import type { db } from "@/server/db"
import { type UserInsert, users } from "@/server/db/schema"
import { normalizeUserInsert } from "@/utils/users"

export const usersCreateManyRecord = async ({ database, input }: { database: typeof db; input: UserInsert[] }) => {
  if (input.length === 0) return []

  const normalizedRows = input.map(item => normalizeUserInsert(item))
  const createdUsers = await database.insert(users).values(normalizedRows).returning()

  return createdUsers
}
