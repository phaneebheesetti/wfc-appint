import type { db } from "@/server/db"
import { type UserInsert } from "@/server/db/schema"

import { usersCreate } from "./users-create"

export const usersCreateMany = async ({ database, input }: { database: typeof db; input: UserInsert[] }) => {
  if (input.length === 0) return []

  const createdUsers = await Promise.all(
    input.map(async userInput => {
      return usersCreate({ database, input: userInput })
    })
  )
  if (!createdUsers) throw new Error("Users not created")

  const filteredCreatedUsers = createdUsers.filter((user): user is NonNullable<typeof user> => !!user)

  return filteredCreatedUsers
}
