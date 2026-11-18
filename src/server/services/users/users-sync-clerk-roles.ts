import { clerkClient } from "@clerk/nextjs/server"
import { and, asc, eq, isNull } from "drizzle-orm"

import { type RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"
import { resolveClerkUserByAnyIdentifier } from "./users-resolve-clerk-user"

export type ClerkRoleEntry = { databaseId: string; role: RolesEnum }

// Reads via the global db (not ctx.db) to bypass the tRPC userRoleMiddleware
// SET ROLE authenticated transaction, which silently filters rows under RLS.
// Caveat: the global db runs on a separate connection, so it does NOT see
// uncommitted writes inside an open tRPC transaction — callers in role-addition
// paths (clone, revive, reactivate) must pass the just-mutated row via extraRows,
// and role-removal paths (deactivate, delete) must pass the just-mutated row id
// via excludeRowIds so the stale-ACTIVE read of that row is filtered out.
export const usersSyncClerkRoles = async ({
  clerkId,
  extraRows = [],
  excludeRowIds = [],
}: {
  clerkId: string | null | undefined
  extraRows?: Array<{ id: string; role: RolesEnum }>
  excludeRowIds?: string[]
}): Promise<{ roles: ClerkRoleEntry[] }> => {
  if (!clerkId) return { roles: [] }

  const rows = await db.query.users.findMany({
    where: and(clerkIdentityMatchesDrizzle(clerkId), isNull(users.deletedAt), eq(users.status, UsersStatusEnum.ACTIVE)),
    columns: { id: true, role: true },
    orderBy: [asc(users.createdAt)],
  })

  const excluded = new Set(excludeRowIds)
  const seenRoles = new Set<string>()
  const roles: ClerkRoleEntry[] = []
  for (const row of rows) {
    if (excluded.has(row.id)) continue
    if (seenRoles.has(row.role)) continue
    seenRoles.add(row.role)
    roles.push({ databaseId: row.id, role: row.role as RolesEnum })
  }
  for (const row of extraRows) {
    if (excluded.has(row.id)) continue
    if (seenRoles.has(row.role)) continue
    seenRoles.add(row.role)
    roles.push({ databaseId: row.id, role: row.role })
  }

  try {
    const client = await clerkClient()
    const clerkUser = await resolveClerkUserByAnyIdentifier(client, clerkId)
    if (!clerkUser) {
      return { roles }
    }

    const currentActiveRole = clerkUser.publicMetadata.role
    const currentActiveStillValid = roles.some(r => r.role === currentActiveRole)

    // When zero live roles remain, leave role/databaseId untouched — the
    // middleware's empty-roles branch will redirect/clear the cookie before
    // these fields matter. When roles exist but the active one was revoked,
    // fall through to roles[0] (canonical createdAt-asc ordering).
    let nextRole = currentActiveRole
    let nextDatabaseId = clerkUser.publicMetadata.databaseId
    if (!currentActiveStillValid && roles.length > 0) {
      const fallback = roles[0]!
      nextRole = fallback.role
      nextDatabaseId = fallback.databaseId
    }

    // Use clerkUser.id (the real Clerk-issued id) rather than the input
    // `clerkId`, since the input may have been the row's clerk_external_id.
    await client.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        role: nextRole,
        databaseId: nextDatabaseId,
        roles,
      },
    })
  } catch (error) {
    console.error(
      `[usersSyncClerkRoles] FAILED clerkId=${clerkId}:`,
      error instanceof Error ? `${error.name}: ${error.message}` : error
    )
    if (error instanceof Error && error.stack) console.error(error.stack)
  }

  return { roles }
}
