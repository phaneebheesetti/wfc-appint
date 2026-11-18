import { eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type User, type UserInsert, users } from "@/server/db/schema"

import { usersCreateRecord } from "./users-create-record"

export const usersInvite = async ({ database, input }: { database: typeof db; input: UserInsert }) => {
  const createdUser = await usersCreateRecord({ database, input })
  if (!createdUser.email) throw new Error("User email not found")

  const invitationUrl = await sendClerkInvite(createdUser)

  const updatedUser = await updateUserWithInvitationUrl(database, createdUser.id, invitationUrl)

  // PARENT invites pass notify=false to Clerk (no default invitation email),
  // so fire the WelcomeParent "Complete setup for your student" email pointing
  // at the Clerk invitation URL — otherwise a freshly-invited parent receives
  // nothing.
  if (updatedUser.role === RolesEnum.PARENT && updatedUser.email) {
    await sendWelcomeParentEmail({ email: updatedUser.email, invitationUrl })
  }

  return updatedUser
}

const sendClerkInvite = async (user: User) => {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/invite`, {
    method: "POST",
    body: JSON.stringify({
      email: user.email,
      phone: user?.phone ?? null,
      role: user.role,
      databaseId: user.id,
      notify: user.role !== RolesEnum.PARENT,
    }),
  })

  const data = (await response.json()) as { data: { url: string } }
  if (!data?.data?.url) throw new Error("Failed to invite user on Clerk")

  return data.data.url
}

const updateUserWithInvitationUrl = async (database: typeof db, userId: string, invitationUrl: string) => {
  const [updatedUser] = await database
    .update(users)
    .set({
      clerkInvitationUrl: invitationUrl,
      clerkInvitationSentAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
  if (!updatedUser) throw new Error("Failed to update user")

  return updatedUser
}

const sendWelcomeParentEmail = async ({ email, invitationUrl }: { email: string; invitationUrl: string }) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, invitationUrl }),
  })
}
