import { eq } from "drizzle-orm"

import { type RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { usersSyncClerkRoles } from "./users-sync-clerk-roles"

export const usersReactivate = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const [updatedUser] = await database
    .update(users)
    .set({ status: UsersStatusEnum.ACTIVE })
    .where(eq(users.id, input.id))
    .returning()

  if (!updatedUser?.clerkId) return updatedUser ?? null

  await usersSyncClerkRoles({
    clerkId: updatedUser.clerkId,
    extraRows: [{ id: updatedUser.id, role: updatedUser.role as RolesEnum }],
  })

  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${updatedUser.clerkId}/unlock`, { method: "POST" })

  return updatedUser
}
