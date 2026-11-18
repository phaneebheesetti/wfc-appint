import { clerkClient as createClerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ROLES_DETAILS, RolesEnum, canRolesCombine } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import { type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { phoneType } from "@/lib/zod/types"
import { usersSyncClerkRoles } from "@/server/services/users/users-sync-clerk-roles"
import { PhoneConflictError, usersValidatePhoneByEmail } from "@/server/services/users/users-validate-phone"
import { withSentry } from "@/utils/api"
import { capitalizeEveryWord } from "@/utils/string"

class SingleRoleConflictError extends Error {
  role: RolesEnum
  constructor(role: RolesEnum) {
    super(`This email is already registered as ${ROLES_DETAILS[role].label} and cannot be used to sign up as Parent.`)
    this.name = "SingleRoleConflictError"
    this.role = role
  }
}

const bodySchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  phone: phoneType.optional().nullable(),
  participantsIds: z.array(z.uuid()).min(1),
})

type UserData = {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
}

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())

  // Find which children are already mapped to this email
  const alreadyMapped = await findAlreadyMappedParticipants({
    email: body.email,
    participantsIds: body.participantsIds,
  })

  const alreadyMappedIds = new Set(alreadyMapped.map(c => c.id))
  const newParticipantIds = body.participantsIds.filter(id => !alreadyMappedIds.has(id))

  // If ALL children are already mapped, block signup
  if (newParticipantIds.length === 0) {
    return NextResponse.json(
      { error: "This email is already associated with all selected participants" },
      { status: 409 }
    )
  }

  let parentUser
  try {
    parentUser = await findOrCreateParentUser(body)
  } catch (err) {
    if (err instanceof SingleRoleConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof PhoneConflictError) {
      // Tagged with `code` so the client can detect this specific case and
      // keep the user on the form (toast + field error) instead of routing
      // them to the failure step.
      return NextResponse.json({ error: err.message, code: "PHONE_CONFLICT" }, { status: 409 })
    }
    throw err
  }
  if (!parentUser) throw new Error("Failed to create parent user")

  await createParentMappings({
    parentUserId: parentUser.id,
    participantsIds: newParticipantIds,
  })

  await sendWelcomeEmail({ email: body.email, clerkId: parentUser.clerk_id })

  const signInToken = await createSignInToken({ clerkUserId: parentUser.clerk_id })

  // Include skipped children info so frontend can show a toast
  const skippedChildren = alreadyMapped.map(c => ({
    name: c.full_name,
    grade: c.grade,
  }))

  return NextResponse.json(
    {
      data: { token: signInToken.token, skippedChildren },
      message: "User signed up successfully",
    },
    { status: 200 }
  )
})

const findAlreadyMappedParticipants = async ({
  email,
  participantsIds,
}: {
  email: string
  participantsIds: string[]
}): Promise<Array<{ id: string; full_name: string | null; grade: string | null }>> => {
  const supabaseServiceClient = createServiceClient()

  // Find if a parent user with this email exists
  const { data: existingUser } = await supabaseServiceClient
    .from("users")
    .select("id")
    .eq("email", email)
    .eq("role", RolesEnum.PARENT)
    .is("deleted_at", null)
    .maybeSingle()

  if (!existingUser) return []

  const mappedIds = new Set<string>()

  // Check legacy parent_user_id
  const { data: legacyChildren } = await supabaseServiceClient
    .from("users")
    .select("id")
    .eq("parent_user_id", existingUser.id)
    .in("id", participantsIds)

  for (const child of legacyChildren ?? []) {
    mappedIds.add(child.id)
  }

  // Check mapping table
  const { data: mappingChildren } = await supabaseServiceClient
    .from("participant_parent_mapping")
    .select("participant_user_id")
    .eq("parent_user_id", existingUser.id)
    .in("participant_user_id", participantsIds)

  for (const mapping of mappingChildren ?? []) {
    mappedIds.add(mapping.participant_user_id)
  }

  if (mappedIds.size === 0) return []

  // Fetch child details for toast message
  const { data: children } = await supabaseServiceClient
    .from("users")
    .select("id, full_name, grade")
    .in("id", [...mappedIds])

  return children ?? []
}

const findOrCreateParentUser = async (rawUserData: UserData) => {
  const supabaseServiceClient = createServiceClient()

  // Stored emails are lowercased by `normalizeUserInsert` on every insert
  // path; the QR signup form's `z.email()` doesn't normalize, so the user's
  // casing may not match. Lowercase here so all lookups + updates below use
  // the canonical form and sibling rows can be found reliably.
  const userData: UserData = { ...rawUserData, email: rawUserData.email.trim().toLowerCase() }

  const { data: liveRows } = (await supabaseServiceClient
    .from("users")
    .select("*")
    .eq("email", userData.email)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })) as { data: SupabaseUser[] | null }

  const rows = liveRows ?? []

  const existingParent = rows.find(r => r.role === RolesEnum.PARENT)
  if (existingParent?.id) return existingParent

  const blockingRow = rows.find(r => !canRolesCombine(RolesEnum.PARENT, r.role as RolesEnum))
  if (blockingRow) throw new SingleRoleConflictError(blockingRow.role as RolesEnum)

  // Cross-email phone duplicate check. Sibling rows (same email) are NOT a
  // conflict — propagation may write this phone to them below.
  if (userData.phone) {
    await usersValidatePhoneByEmail({ phone: userData.phone, email: userData.email })
  }

  // Snapshot whether this email is already onboarded under another role. If
  // so, the active sibling owns the profile fields and we must NOT overwrite
  // them with the parent's form input. If not, the donor's stored profile is
  // an invite-time placeholder (the admin invite UI auto-fills firstName from
  // the email prefix) — the parent's form input is the user's first real
  // profile and should win across every row.
  const activeSibling = rows.find(r => r.status === UsersStatusEnum.ACTIVE)
  const hasActiveSibling = Boolean(activeSibling)

  // Resolved profile applied consistently to the new Clerk user, the cloned
  // PARENT row, and any sibling rows. When a sibling is already active, its
  // profile is the source of truth; otherwise the parent's form input is.
  const resolvedProfile = {
    firstName: activeSibling?.first_name ?? userData.firstName,
    lastName: activeSibling?.last_name ?? userData.lastName,
    phone: activeSibling?.phone ?? userData.phone ?? null,
  }

  // Multi-role-eligible donor present (ORG_ADMIN / ORG_STAFF) → clone its
  // identity into a new PARENT row. Two sub-cases:
  //   - donor.clerk_id present (donor previously onboarded, or its Clerk user
  //     was pre-created elsewhere) → reuse it.
  //   - donor.clerk_id NULL (invited but never accepted) → create a new Clerk
  //     user now and adopt every sibling row under it, so both DB rows share
  //     one clerk identity and publicMetadata.roles can carry both roles.
  const donor = rows[0]
  if (donor) {
    const clerkUserId =
      donor.clerk_id ??
      (await adoptSiblingRowsUnderNewClerkUser({ email: userData.email, profile: resolvedProfile })).id

    const cloned = await cloneDatabaseUserAsParent({
      donor: { ...donor, clerk_id: clerkUserId },
      email: userData.email,
      profile: resolvedProfile,
    })
    if (cloned.error || !cloned.data) {
      console.error("[signup/parent] cloneDatabaseUserAsParent failed", {
        donorId: donor.id,
        donorRole: donor.role,
        donorOriginalClerkId: donor.clerk_id,
        resolvedClerkUserId: clerkUserId,
        supabaseErrorMessage: cloned.error?.message,
        supabaseErrorDetails: cloned.error?.details,
        supabaseErrorHint: cloned.error?.hint,
        supabaseErrorCode: cloned.error?.code,
      })
      const reason = cloned.error?.message ?? cloned.error?.details ?? cloned.error?.hint ?? "no row returned"
      throw new Error(`Failed to clone donor user as parent: ${reason}`)
    }

    // When no sibling was active before this signup (e.g., an ORG_ADMIN was
    // invited but never accepted), the parent's form input is the first real
    // profile the user has supplied — copy it onto every sibling row so all
    // roles share the same firstName/lastName/phone per the row-model
    // invariant. If any sibling WAS active, its profile is already the
    // source of truth and must remain untouched.
    if (!hasActiveSibling) {
      await propagateProfileToSiblings({
        email: userData.email,
        excludeId: cloned.data.id,
        profile: resolvedProfile,
      })
    }

    // Keep Clerk's publicMetadata.roles array in sync. Pass extraRows for both
    // donor and clone in case the global db connection in usersSyncClerkRoles
    // hasn't yet observed the service-client writes from above.
    await usersSyncClerkRoles({
      clerkId: clerkUserId,
      extraRows: [
        { id: donor.id, role: donor.role as RolesEnum },
        { id: cloned.data.id, role: RolesEnum.PARENT },
      ],
    })

    // QR self-signup must land the user on the PARENT dashboard, not the
    // donor role's dashboard. usersSyncClerkRoles preserves the existing
    // active role if it's still valid, so explicitly switch to PARENT here.
    await switchActiveRoleToParent({
      clerkUserId,
      parentDatabaseId: cloned.data.id,
    })

    return cloned.data
  }

  const createdClerkUser = await createClerkUser(userData)
  const createdDatabaseUser = await createDatabaseUser({ ...userData, clerkId: createdClerkUser.id })

  await updateClerkUser({
    clerkUserId: createdClerkUser.id,
    databaseId: createdDatabaseUser.data.id,
  })

  return createdDatabaseUser.data
}

// Creates a Clerk user for an email whose sibling DB rows are all still
// PENDING with clerk_id=NULL (e.g. an ORG_ADMIN invited via the admin UI but
// never accepted), then propagates the new clerk_id + ACTIVE status to every
// sibling row so they share one identity. Returns the created Clerk user.
const adoptSiblingRowsUnderNewClerkUser = async ({
  email,
  profile,
}: {
  email: string
  profile: { firstName: string; lastName: string; phone?: string | null }
}) => {
  const created = await createClerkUser({
    firstName: profile.firstName,
    lastName: profile.lastName,
    email,
    phone: profile.phone,
  })

  const supabaseServiceClient = createServiceClient()
  const { error: adoptError } = await supabaseServiceClient
    .from("users")
    .update({ clerk_id: created.id, status: UsersStatusEnum.ACTIVE })
    .eq("email", email)
    .is("deleted_at", null)
    .is("clerk_id", null)

  if (adoptError) {
    console.error("[signup/parent] adoptSiblingRowsUnderNewClerkUser update failed", {
      email,
      createdClerkUserId: created.id,
      supabaseErrorMessage: adoptError.message,
      supabaseErrorDetails: adoptError.details,
      supabaseErrorHint: adoptError.hint,
      supabaseErrorCode: adoptError.code,
    })
    throw new Error(`Failed to adopt sibling rows under new Clerk user: ${adoptError.message ?? "unknown error"}`)
  }

  return created
}

// Writes the resolved profile (firstName, lastName, phone, fullName) to every
// live row for `email` except the just-created PARENT row. Only called when
// no sibling row was ACTIVE before signup — see the gate in
// `findOrCreateParentUser`.
const propagateProfileToSiblings = async ({
  email,
  excludeId,
  profile,
}: {
  email: string
  excludeId: string
  profile: { firstName: string; lastName: string; phone?: string | null }
}) => {
  const supabaseServiceClient = createServiceClient()

  const firstName = capitalizeEveryWord(profile.firstName)
  const lastName = capitalizeEveryWord(profile.lastName)

  const { error } = await supabaseServiceClient
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      phone: profile.phone ?? null,
    })
    .eq("email", email)
    .is("deleted_at", null)
    .neq("id", excludeId)

  if (error) {
    console.error("[signup/parent] propagateProfileToSiblings update failed", {
      email,
      excludeId,
      supabaseErrorMessage: error.message,
      supabaseErrorDetails: error.details,
      supabaseErrorHint: error.hint,
      supabaseErrorCode: error.code,
    })
    throw new Error(`Failed to propagate profile to sibling rows: ${error.message ?? "unknown error"}`)
  }
}

const cloneDatabaseUserAsParent = async ({
  donor,
  email,
  profile,
}: {
  donor: SupabaseUser
  email: string
  profile: { firstName: string; lastName: string; phone?: string | null }
}) => {
  const supabaseServiceClient = createServiceClient()

  // Profile fields come from the resolved profile (active sibling's data if
  // present, else the parent's form input). clerk identity and contact_info
  // still come from the donor row so all sibling rows share one identity.
  const firstName = capitalizeEveryWord(profile.firstName)
  const lastName = capitalizeEveryWord(profile.lastName)
  const phone = profile.phone ?? null

  return supabaseServiceClient
    .from("users")
    .insert({
      clerk_id: donor.clerk_id,
      clerk_external_id: donor.clerk_external_id,
      contact_info_id: donor.contact_info_id,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      email,
      phone,
      status: UsersStatusEnum.ACTIVE,
      role: RolesEnum.PARENT,
    })
    .select()
    .single()
}

// Forces publicMetadata.role = PARENT (and databaseId to the new PARENT row)
// after a clone. usersSyncClerkRoles preserves the donor's existing active
// role if still valid; QR self-signup needs the user to land on the PARENT
// dashboard immediately, so override after sync.
const switchActiveRoleToParent = async ({
  clerkUserId,
  parentDatabaseId,
}: {
  clerkUserId: string
  parentDatabaseId: string
}) => {
  const clerkClient = await createClerkClient()
  const clerkUser = await clerkClient.users.getUser(clerkUserId)

  await clerkClient.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      role: RolesEnum.PARENT,
      databaseId: parentDatabaseId,
    },
  })
}

const createDatabaseUser = async ({ clerkId, firstName, lastName, email, phone }: UserData & { clerkId: string }) => {
  const supabaseServiceClient = createServiceClient()

  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  return supabaseServiceClient
    .from("users")
    .insert({
      clerk_id: clerkId,
      first_name: capitalizedFirstName,
      last_name: capitalizedLastName,
      full_name: `${capitalizedFirstName} ${capitalizedLastName}`,
      email,
      phone: phone ?? null,
      status: UsersStatusEnum.ACTIVE,
      role: RolesEnum.PARENT,
    })
    .select()
    .single()
}

const createParentMappings = async ({
  parentUserId,
  participantsIds,
}: {
  parentUserId: string
  participantsIds: string[]
}) => {
  const supabaseServiceClient = createServiceClient()

  for (const participantId of participantsIds) {
    // Check if this exact mapping already exists (dedup)
    const { data: existingMapping } = await supabaseServiceClient
      .from("participant_parent_mapping")
      .select("parent_user_id")
      .eq("parent_user_id", parentUserId)
      .eq("participant_user_id", participantId)
      .maybeSingle()

    if (existingMapping) continue

    // Self-signup always creates a secondary mapping — only org admins can designate a primary
    await supabaseServiceClient.from("participant_parent_mapping").insert({
      parent_user_id: parentUserId,
      participant_user_id: participantId,
    })
  }
}

const createClerkUser = async ({ firstName, lastName, email, phone }: UserData) => {
  const clerkClient = await createClerkClient()

  const capitalizedFirstName = capitalizeEveryWord(firstName)
  const capitalizedLastName = capitalizeEveryWord(lastName)

  return clerkClient.users.createUser({
    firstName: capitalizedFirstName,
    lastName: capitalizedLastName,
    emailAddress: [email],
    phoneNumber: phone ? [phone] : undefined,
  })
}

const updateClerkUser = async ({ clerkUserId, databaseId }: { clerkUserId: string; databaseId: string }) => {
  const clerkClient = await createClerkClient()

  return clerkClient.users.updateUser(clerkUserId, {
    publicMetadata: {
      databaseId,
      role: RolesEnum.PARENT,
      roles: [{ databaseId, role: RolesEnum.PARENT }],
    },
  })
}

const createSignInToken = async ({ clerkUserId }: { clerkUserId: string }) => {
  const clerkClient = await createClerkClient()

  return clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 300,
  })
}

const sendWelcomeEmail = async ({ email, clerkId }: { email: string; clerkId: string }) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({
      email,
      clerkId,
    }),
  })
}
