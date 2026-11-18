import { type User as ClerkUser, type clerkClient } from "@clerk/nextjs/server"
import { and, isNull } from "drizzle-orm"

import { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"

// Resolves a Clerk user when the caller's identifier might be EITHER the
// row's `clerk_id` OR its `clerk_external_id`. Both columns hold Clerk-issued
// user ids (legacy / alternate values from migrations) — the [clerkIdentityMatchesDrizzle]
// helper already treats them as interchangeable for DB lookups.
//
// We look up the row matching the input identifier in either column, then try
// `client.users.getUser` against EACH known id. If all direct lookups 404,
// fall back to `getUserList({ externalId })` in case the value is actually
// Clerk's externalId field on a different Clerk user.
//
// Returns `null` if nothing resolves, so callers can decide whether to no-op
// or surface a 404.
export const resolveClerkUserByAnyIdentifier = async (
  client: Awaited<ReturnType<typeof clerkClient>>,
  identifier: string
): Promise<ClerkUser | null> => {
  // Pull both candidate columns off the matching DB row so a stale `clerk_id`
  // doesn't block us from trying `clerk_external_id`.
  const row = await db.query.users.findFirst({
    where: and(clerkIdentityMatchesDrizzle(identifier), isNull(users.deletedAt)),
    columns: { clerkId: true, clerkExternalId: true },
  })

  const candidates = Array.from(
    new Set([identifier, row?.clerkId, row?.clerkExternalId].filter((s): s is string => !!s))
  )

  for (const id of candidates) {
    try {
      return await client.users.getUser(id)
    } catch (err) {
      const status = (err as { status?: number } | null)?.status
      if (status !== 404) throw err
    }
  }

  // Last resort: any of the candidates might be the value stored in Clerk's
  // `externalId` field on the user (different from our DB's clerk_external_id
  // column, which holds Clerk user ids).
  const list = await client.users.getUserList({ externalId: candidates, limit: 1 })
  return list.data[0] ?? null
}
