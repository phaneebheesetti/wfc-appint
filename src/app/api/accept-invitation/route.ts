import { clerkClient as createClerkClient } from "@clerk/nextjs/server"
import { and, isNull, ne, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import { type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { phoneType } from "@/lib/zod/types"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { usersSyncClerkRoles } from "@/server/services/users/users-sync-clerk-roles"
import { PhoneConflictError, usersValidatePhone } from "@/server/services/users/users-validate-phone"
import { withSentry } from "@/utils/api"
import { capitalizeEveryWord } from "@/utils/string"

const bodySchema = z.object({
  clerkUserId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: phoneType.optional().nullable(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { clerkUserId, firstName, lastName, phone } = body

  const clerkClient = await createClerkClient()

  const clerkUser = await clerkClient.users.getUser(clerkUserId)
  if (!clerkUser) return NextResponse.json({ error: "Clerk user not found" }, { status: 404 })

  const email = clerkUser.emailAddresses?.[0]?.emailAddress
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  const { databaseId, role } = clerkUser.publicMetadata
  if (!databaseId) return NextResponse.json({ error: "Database user not found" }, { status: 404 })

  if (phone) {
    try {
      await usersValidatePhone({ phone, databaseId })
    } catch (err) {
      // Expected user-input conflict — return 409 so the client toasts the
      // friendly message instead of `withSentry` reporting it as a 5xx.
      // (The client-side pre-check normally catches this before signUp.create
      // runs; this is the defense-in-depth path.)
      if (err instanceof PhoneConflictError) {
        return NextResponse.json({ error: err.message }, { status: 409 })
      }
      throw err
    }
  }

  const alreadyActiveRedirect = await resolveAlreadyActiveRedirect({ databaseId, role })
  if (alreadyActiveRedirect) {
    return NextResponse.json(
      { data: { redirectTo: alreadyActiveRedirect }, message: "User already active" },
      { status: 200 }
    )
  }

  await updateClerkUser({ userId: clerkUserId, firstName, lastName, phone })

  await updateDatabaseUser({ userId: clerkUserId, databaseId, firstName, lastName, email, phone })

  await propagateClerkIdToSiblingRows({ clerkUserId, databaseId, email, firstName, lastName, phone })

  await usersSyncClerkRoles({ clerkId: clerkUserId })

  await sendWelcomeEmail({ email, role })

  return NextResponse.json({ data: { redirectTo: null }, message: "User onboarded successfully" }, { status: 200 })
})

const propagateClerkIdToSiblingRows = async ({
  clerkUserId,
  databaseId,
  email,
  firstName,
  lastName,
  phone,
}: {
  clerkUserId: string
  databaseId: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
}) => {
  const serviceClient = createServiceClient()

  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  const siblingIds = await findSiblingIdsForAcceptance({ clerkUserId, email, excludeDatabaseId: databaseId })
  if (siblingIds.length === 0) return

  // `?? undefined` for phone keeps existing sibling phones intact when the
  // accepted row didn't collect one (Supabase JS treats `undefined` as
  // "don't set this column"); when phone IS provided, we propagate it so
  // every sibling row reflects the profile the user just submitted.
  await serviceClient
    .from("users")
    .update({
      clerk_id: clerkUserId,
      status: UsersStatusEnum.ACTIVE,
      first_name: capitalizedFirstName ?? undefined,
      last_name: capitalizedLastName ?? undefined,
      full_name: `${capitalizedFirstName ?? ""} ${capitalizedLastName ?? ""}`.trim() ?? undefined,
      phone: phone ?? undefined,
    })
    .in("id", siblingIds)

  // Intentionally no welcome-parent email here: every code path that creates
  // a PARENT row (usersCreate, usersInvite, usersCloneForRole — both the
  // fresh-invite and existing-Clerk-user clone branches) already fires the
  // WelcomeParent "Complete setup" email at creation time. Sending another
  // one on first acceptance of a sibling role would be a duplicate "complete
  // setup" message for a parent role the user is already set up on.
}

// Case-insensitive sibling lookup so pre-multi-role rows with mixed-case
// emails still match the lowercased Clerk email and get their clerk_id +
// status propagated on first accept.
//
// Does NOT filter on `clerk_id IS NULL`: in the parent-via-participant flow
// the clerk_id is pre-set on the donor row by `usersCreate`, so when an
// ORG_ADMIN/STAFF row is later cloned off that donor BOTH rows already have
// clerk_id. They still need their status flipped to ACTIVE on first accept,
// so match by email + clerkUserId and let the update be idempotent on the
// already-onboarded row.
const findSiblingIdsForAcceptance = async ({
  clerkUserId,
  email,
  excludeDatabaseId,
}: {
  clerkUserId: string
  email: string
  excludeDatabaseId: string
}): Promise<string[]> => {
  const target = email.trim().toLowerCase()
  const rows = await db.query.users.findMany({
    where: and(
      isNull(users.deletedAt),
      ne(users.id, excludeDatabaseId),
      sql`(${users.clerkId} IS NULL OR ${users.clerkId} = ${clerkUserId}) AND lower(${users.email}) = ${target}`
    ),
    columns: { id: true },
  })
  return rows.map(r => r.id)
}

const resolveAlreadyActiveRedirect = async ({
  databaseId,
  role,
}: {
  databaseId: string
  role: RolesEnum
}): Promise<string | null> => {
  const serviceClient = createServiceClient()

  const { data: existingUser } = (await serviceClient.from("users").select("*").eq("id", databaseId).single()) as {
    data: SupabaseUser | null
  }

  if (existingUser?.id && existingUser?.status === UsersStatusEnum.ACTIVE) {
    return role === RolesEnum.PARENT ? `/dashboard?role=${RolesEnum.PARENT}` : "/dashboard"
  }

  return null
}

const updateClerkUser = async ({
  userId,
  firstName,
  lastName,
  phone,
}: {
  userId: string
  firstName: string
  lastName: string
  phone?: string | null
}) => {
  const clerkClient = await createClerkClient()

  await clerkClient.users.updateUser(userId, {
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
  })

  if (phone) {
    await clerkClient.phoneNumbers.createPhoneNumber({
      phoneNumber: phone,
      userId: userId,
      verified: true,
      primary: true,
    })
  }
}

const updateDatabaseUser = async ({
  userId,
  databaseId,
  firstName,
  lastName,
  email,
  phone,
}: {
  userId: string
  databaseId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}) => {
  const serviceClient = createServiceClient()

  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  await serviceClient
    .from("users")
    .update({
      clerk_id: userId,
      status: UsersStatusEnum.ACTIVE,
      email: email ?? undefined,
      first_name: capitalizedFirstName ?? undefined,
      last_name: capitalizedLastName ?? undefined,
      full_name: `${capitalizedFirstName ?? ""} ${capitalizedLastName ?? ""}`.trim() ?? undefined,
      phone: phone ?? undefined,
    })
    .eq("id", databaseId)
}

const sendWelcomeEmail = async ({ email, role }: { email: string; role: RolesEnum }) => {
  if (role === RolesEnum.PARENT) return

  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome`, {
    method: "POST",
    body: JSON.stringify({
      emails: [email],
    }),
  })
}
