import { and, eq, isNull } from "drizzle-orm"

import { env } from "@/env"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"

// Thrown when the phone is in use by a DIFFERENT person — sibling rows (same
// email, different role) are NOT a conflict in the multi-role model. Callers
// can catch this distinctly from generic errors to return a friendly 409 and
// keep Sentry quiet.
export class PhoneConflictError extends Error {
  constructor() {
    super("This phone number is already being used by another account, please use a different one.")
    this.name = "PhoneConflictError"
  }
}

// Validates that `phone` is not already used by another person. Multi-role
// users have multiple users rows sharing one email — any phone match within
// that sibling set is the user's own profile and is allowed.
//
// `databaseId` identifies the row the caller is currently onboarding. We use
// its email as the sibling-set anchor.
export const usersValidatePhone = async ({
  phone,
  databaseId,
}: {
  phone: string
  databaseId: string
}): Promise<void> => {
  // Read via global `db` (bypasses RLS) so this works for unauthenticated
  // request paths (onboarding form runs before the user is signed in).
  const currentRow = await db.query.users.findFirst({
    where: and(eq(users.id, databaseId), isNull(users.deletedAt)),
    columns: { email: true },
  })
  const currentEmail = currentRow?.email?.trim().toLowerCase() ?? null

  await assertPhoneAvailableForEmail({ phone, currentEmail })
}

// Same conflict semantics as `usersValidatePhone`, but anchored on an email
// instead of a database row id. Used by the parent QR self-signup flow where
// no users row exists yet for the email.
export const usersValidatePhoneByEmail = async ({ phone, email }: { phone: string; email: string }): Promise<void> => {
  await assertPhoneAvailableForEmail({ phone, currentEmail: email.trim().toLowerCase() })
}

const assertPhoneAvailableForEmail = async ({
  phone,
  currentEmail,
}: {
  phone: string
  currentEmail: string | null
}): Promise<void> => {
  // 1. Clerk-side: any OTHER Clerk user holds this phone? A hit whose
  //    primary email matches `currentEmail` is the user's own pre-created
  //    Clerk record (parent-via-participant flow) — not a conflict.
  const clerkResponse = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/find`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
  const clerkPayload = (await clerkResponse.json()) as {
    data?: Array<{ emailAddresses?: Array<{ emailAddress?: string }> }>
  }
  const clerkConflict = (clerkPayload.data ?? []).some(u => {
    const primaryEmail = u.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ?? null
    return primaryEmail !== currentEmail
  })
  if (clerkConflict) throw new PhoneConflictError()

  // 2. DB-side: any other live row holds this phone? Sibling rows (same
  //    email as the current row) are excluded.
  const phoneMatches = await db.query.users.findMany({
    where: and(eq(users.phone, phone), isNull(users.deletedAt)),
    columns: { id: true, email: true },
  })

  const dbConflict = phoneMatches.some(row => {
    const rowEmail = row.email?.trim().toLowerCase() ?? null
    return rowEmail !== currentEmail
  })
  if (dbConflict) throw new PhoneConflictError()
}
