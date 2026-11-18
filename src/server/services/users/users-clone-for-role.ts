import { eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type UserSelect, users } from "@/server/db/schema"

import { usersSyncClerkRoles } from "./users-sync-clerk-roles"

export const usersCloneForRole = async ({
  database,
  input,
}: {
  database: typeof db
  input: { donor: UserSelect; role: RolesEnum; invitedByUserId?: string | null }
}): Promise<UserSelect> => {
  const { donor, role, invitedByUserId } = input

  const donorIsActive = donor.status === UsersStatusEnum.ACTIVE && !donor.deletedAt
  const donorHasClerkUser = !!donor.clerkId

  const [clonedUser] = await database
    .insert(users)
    .values({
      clerkId: donor.clerkId,
      clerkExternalId: donor.clerkExternalId,
      contactInfoId: donor.contactInfoId,
      parentUserId: donor.parentUserId,
      invitedByUserId: invitedByUserId ?? null,
      encryptionKeySecretId: donor.encryptionKeySecretId,
      firstName: donor.firstName,
      lastName: donor.lastName,
      fullName: donor.fullName,
      email: donor.email,
      phone: donor.phone,
      pin: donor.pin,
      grade: donor.grade,
      teacherName: donor.teacherName,
      encrypted: donor.encrypted,
      role,
      status: donorIsActive ? UsersStatusEnum.ACTIVE : UsersStatusEnum.PENDING,
    })
    .returning()

  if (!clonedUser) throw new Error("Failed to clone user for role")

  let finalRow = clonedUser

  // Branching is on donor.clerkId, not donor.status. Whenever a Clerk user
  // already exists for this email, Clerk's createInvitation flow is a dead
  // end: signUp.create({strategy:"ticket"}) in onboarding-form-step fails
  // with invitation_account_exists. Use magic-signin (signInTokens) in that
  // case so the invitee can sign in without a password.
  if (!donorHasClerkUser) {
    // Truly fresh — no Clerk user yet. Standard invitation flow.
    const invitationUrl = await sendClerkInviteForClonedRow(clonedUser)
    if (invitationUrl) {
      const [stamped] = await database
        .update(users)
        .set({ clerkInvitationUrl: invitationUrl, clerkInvitationSentAt: new Date() })
        .where(eq(users.id, clonedUser.id))
        .returning()
      if (stamped) finalRow = stamped

      // Fresh PARENT row off a non-active donor: notify=false on Clerk means
      // no default invitation email — fire the WelcomeParent "Complete setup"
      // email pointing at the Clerk invitation URL so the parent receives
      // something. (For non-PARENT clones with notify=true, Clerk sends its
      // own invitation email.)
      if (finalRow.role === RolesEnum.PARENT && finalRow.email) {
        await sendWelcomeParentEmailForFreshInvite({ email: finalRow.email, invitationUrl })
      }
    }
  } else if (finalRow.role === RolesEnum.PARENT && finalRow.email && finalRow.clerkId) {
    // PARENT clone off a donor that already has a Clerk user (whether ACTIVE
    // or PENDING — covers both the "active sibling" and "parent-via-participant
    // pre-created Clerk user" cases). Send the WelcomeParent magic-signin email.
    await sendWelcomeParentEmailForExistingUser({ email: finalRow.email, clerkId: finalRow.clerkId })
  } else if (!donorIsActive && finalRow.email && finalRow.clerkId) {
    // Non-PARENT clone (ORG_ADMIN / ORG_STAFF) where the donor's Clerk user
    // exists but isn't onboarded — invitee has no password, so they need a
    // magic-signin link to reach their dashboard.
    await sendWelcomeOrgRoleEmailForExistingUser({
      email: finalRow.email,
      clerkId: finalRow.clerkId,
      role: finalRow.role as RolesEnum,
    })
  }
  // Remaining case: donor ACTIVE + non-PARENT clone — no email. The invitee
  // already has a live session somewhere and the new role appears in their
  // role switcher via the publicMetadata.roles sync below.

  await usersSyncClerkRoles({
    clerkId: finalRow.clerkId,
    extraRows: [
      { id: donor.id, role: donor.role as RolesEnum },
      { id: finalRow.id, role: finalRow.role as RolesEnum },
    ],
  })

  return finalRow
}

const sendWelcomeParentEmailForFreshInvite = async ({
  email,
  invitationUrl,
}: {
  email: string
  invitationUrl: string
}) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, invitationUrl }),
  })
}

const sendWelcomeParentEmailForExistingUser = async ({ email, clerkId }: { email: string; clerkId: string }) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, clerkId }),
  })
}

const sendWelcomeOrgRoleEmailForExistingUser = async ({
  email,
  clerkId,
  role,
}: {
  email: string
  clerkId: string
  role: RolesEnum
}) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-organization-role`, {
    method: "POST",
    body: JSON.stringify({ email, clerkId, role }),
  })
}

const sendClerkInviteForClonedRow = async (row: UserSelect): Promise<string | null> => {
  if (!row.email) return null

  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/invite`, {
    method: "POST",
    body: JSON.stringify({
      email: row.email,
      phone: row.phone ?? null,
      role: row.role,
      databaseId: row.id,
      notify: row.role !== RolesEnum.PARENT,
    }),
  })

  const data = (await response.json()) as { data?: { url?: string } }
  return data?.data?.url ?? null
}
