import { clerkClient } from "@clerk/nextjs/server"
import { and, eq, isNull } from "drizzle-orm"

import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"
import { resolveClerkUserByAnyIdentifier } from "./users-resolve-clerk-user"
import { usersSyncClerkRoles } from "./users-sync-clerk-roles"

export const usersDeactivate = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const [updatedUser] = await database
    .update(users)
    .set({ status: UsersStatusEnum.INACTIVE })
    .where(eq(users.id, input.id))
    .returning()

  if (!updatedUser?.clerkId) return updatedUser ?? null

  await usersSyncClerkRoles({ clerkId: updatedUser.clerkId, excludeRowIds: [updatedUser.id] })

  const anyOtherActive = await database.query.users.findFirst({
    where: and(
      clerkIdentityMatchesDrizzle(updatedUser.clerkId),
      eq(users.status, UsersStatusEnum.ACTIVE),
      isNull(users.deletedAt)
    ),
    columns: { id: true },
  })

  if (!anyOtherActive) {
    await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${updatedUser.clerkId}/lock`, { method: "POST" })
  }
  const client = await clerkClient()

  // The row's clerkId may live in `clerk_external_id` rather than `clerk_id`,
  // and `sessions.getSessionList({ userId })` requires the Clerk-issued id.
  const clerkUser = await resolveClerkUserByAnyIdentifier(client, updatedUser.clerkId)
  if (!clerkUser) return updatedUser

  // lockUser blocks future sign-ins but does NOT invalidate the existing
  // __session JWT — it stays valid until natural expiry. When this user has
  // no remaining roles, revoke active sessions so middleware sees them signed
  // out on the very next request rather than minutes later.
  if (!anyOtherActive) {
    const sessions = await client.sessions.getSessionList({ userId: clerkUser.id, status: "active" })
    await Promise.all(sessions.data.map(session => client.sessions.revokeSession(session.id)))
  }

  return updatedUser
}
