import type { db } from "@/server/db"
import { type UserInsert } from "@/server/db/schema"

import { usersInvite } from "./users-invite"

export const usersInviteMany = async ({ database, input }: { database: typeof db; input: UserInsert[] }) => {
  if (input.length === 0) return []

  const invitedUsers = await Promise.all(
    input.map(async userInput => {
      return usersInvite({ database, input: userInput })
    })
  )
  if (!invitedUsers) throw new Error("Users not invited")

  const filteredInvitedUsers = invitedUsers.filter((user): user is NonNullable<typeof user> => !!user)

  return filteredInvitedUsers
}
