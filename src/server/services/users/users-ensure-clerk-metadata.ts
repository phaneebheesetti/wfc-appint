import { clerkClient } from "@clerk/nextjs/server"
import { and, inArray, isNull, sql } from "drizzle-orm"

import { UsersStatusEnum } from "@/constants/users"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { resolveClerkUserByAnyIdentifier } from "./users-resolve-clerk-user"
import { usersSyncClerkRoles } from "./users-sync-clerk-roles"

// Runs on every sign-in via <EnsureClerkMetadata>. Two responsibilities:
//   1. Adopt/activate sibling rows that share this email:
//      - clerk_id IS NULL → orphan rows from pre-multi-role / case-sensitive
//        accept-invitation flows. Adopt them under this clerk_id and flip
//        status to ACTIVE.
//      - clerk_id matches this user AND status = PENDING → rows that were
//        pre-created with clerk_id (parent-via-participant flow) or cloned
//        off a donor with clerk_id, and reach ACTIVE only when the human
//        actually signs in. Magic-signin links (welcome-parent,
//        welcome-organization-role) don't go through /api/accept-invitation,
//        so this is the only place that flips them.
//   2. Ensure publicMetadata.roles is set (legacy single-role users
//      pre-dating the array, and the just-activated rows above).
export const usersEnsureClerkMetadata = async ({ clerkId }: { clerkId: string }): Promise<{ backfilled: boolean }> => {
  const client = await clerkClient()
  // Caller's `clerkId` may be a row value from either `clerk_id` or
  // `clerk_external_id`. Resolve so getUser-only Clerk APIs work.
  const clerkUser = await resolveClerkUserByAnyIdentifier(client, clerkId)
  if (!clerkUser) return { backfilled: false }

  const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null
  const reconciledCount = email ? await adoptOrActivateRowsByEmail({ clerkId, email }) : 0

  const existingRoles = clerkUser.publicMetadata.roles
  const hasRolesArray = Array.isArray(existingRoles) && existingRoles.length > 0

  if (hasRolesArray && reconciledCount === 0) return { backfilled: false }

  await usersSyncClerkRoles({ clerkId })
  return { backfilled: true }
}

const adoptOrActivateRowsByEmail = async ({ clerkId, email }: { clerkId: string; email: string }): Promise<number> => {
  const target = email.trim().toLowerCase()
  if (!target) return 0

  // Match either:
  //   (a) clerk_id IS NULL (true orphans, any status) — existing behavior.
  //   (b) clerk_id = this user AND status = PENDING — rows pre-stamped with
  //       this clerk_id by the parent-via-participant or clone-with-clerkId
  //       paths, waiting for the human to actually sign in. Restrict to
  //       PENDING here so we never accidentally reactivate INACTIVE rows
  //       (deliberately deactivated by an admin).
  const rows = await db.query.users.findMany({
    where: and(
      isNull(users.deletedAt),
      sql`lower(${users.email}) = ${target}`,
      sql`(${users.clerkId} IS NULL OR (${users.clerkId} = ${clerkId} AND ${users.status} = ${UsersStatusEnum.PENDING}))`
    ),
    columns: { id: true, role: true, status: true, clerkId: true },
  })

  if (rows.length === 0) return 0

  // Only update rows that actually need a change. Rows already in ACTIVE
  // status with matching clerk_id are excluded by the query above; the
  // remaining set is "orphans we adopt" + "matching-clerk_id PENDING we
  // activate" — both want { clerkId, status=ACTIVE }.
  await db
    .update(users)
    .set({ clerkId, status: UsersStatusEnum.ACTIVE, updatedAt: new Date() })
    .where(
      inArray(
        users.id,
        rows.map(r => r.id)
      )
    )

  return rows.length
}
