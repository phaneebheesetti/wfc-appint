import { and, eq, isNull, ne } from "drizzle-orm"

import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"
import { usersSyncClerkRoles } from "./users-sync-clerk-roles"

export const usersDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const [updatedUser] = await database
    .update(users)
    .set({ deletedAt: new Date(), status: UsersStatusEnum.DELETED })
    .where(eq(users.id, input.id))
    .returning()

  if (!updatedUser?.clerkId) return updatedUser ?? null

  const siblings = await database.query.users.findFirst({
    where: and(clerkIdentityMatchesDrizzle(updatedUser.clerkId), ne(users.id, updatedUser.id), isNull(users.deletedAt)),
    columns: { id: true },
  })

  if (siblings) {
    await usersSyncClerkRoles({ clerkId: updatedUser.clerkId, excludeRowIds: [updatedUser.id] })
  } else {
    await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${updatedUser.clerkId}/delete`, { method: "POST" })
  }

  return updatedUser
}
