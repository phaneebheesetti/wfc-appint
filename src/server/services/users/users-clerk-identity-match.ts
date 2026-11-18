import { type SQL, eq, or } from "drizzle-orm"

import { users } from "@/server/db/schema"

// Single source of truth for "which users row(s) belong to this Clerk identity".
// Some legacy users carry their identifier in clerk_external_id rather than
// clerk_id (PR #928 added the column to support old data); always check both
// columns so lookups don't silently miss those rows.
export const clerkIdentityMatchesDrizzle = (clerkIdentity: string): SQL =>
  or(eq(users.clerkId, clerkIdentity), eq(users.clerkExternalId, clerkIdentity))!

// PostgREST/Supabase-client variant — string is the value used inside the .or()
// filter expression: `clerk_id.eq.<id>,clerk_external_id.eq.<id>`.
export const clerkIdentityMatchesSupabase = (clerkIdentity: string): string =>
  `clerk_id.eq.${clerkIdentity},clerk_external_id.eq.${clerkIdentity}`
