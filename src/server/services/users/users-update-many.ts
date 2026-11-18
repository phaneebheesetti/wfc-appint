import type { db } from "@/server/db"
import { type UserInsert } from "@/server/db/schema"

import { usersUpdate } from "./users-update"

export const usersUpdateMany = async ({ database, input }: { database: typeof db; input: UserInsert[] }) => {
  if (input.length === 0) return []

  const updatedUsers = await Promise.all(
    input.map(async userInput => {
      return usersUpdate({ database, input: { ...userInput, id: userInput.id! } })
    })
  )
  if (!updatedUsers) throw new Error("Users not updated")

  const filteredUpdatedUsers = updatedUsers.filter((user): user is NonNullable<typeof user> => !!user)

  return filteredUpdatedUsers
}
