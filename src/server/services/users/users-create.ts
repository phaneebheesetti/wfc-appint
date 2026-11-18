import { eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type User, type UserInsert, users } from "@/server/db/schema"

import { usersCreateRecord } from "./users-create-record"

export const usersCreate = async ({ database, input }: { database: typeof db; input: UserInsert }) => {
  const createdUser = await usersCreateRecord({ database, input })
  if (!createdUser?.email && !createdUser?.phone) {
    return createdUser
  }

  const clerkId = await createClerkUser(createdUser)
  const updatedUser = await updateUserWithClerkId(database, createdUser.id, clerkId)

  // A freshly-created PARENT row receives no Clerk invitation email (this path
  // creates the Clerk user directly, not via createInvitation). Fire the
  // WelcomeParent "Complete setup for your student" email so the recipient
  // gets the sign-in link.
  if (updatedUser.role === RolesEnum.PARENT && updatedUser.email && updatedUser.clerkId) {
    await sendWelcomeParentEmail({ email: updatedUser.email, clerkId: updatedUser.clerkId })
  }

  return updatedUser
}

const sendWelcomeParentEmail = async ({ email, clerkId }: { email: string; clerkId: string }) => {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/email/send/welcome-parent`, {
    method: "POST",
    body: JSON.stringify({ email, clerkId }),
  })
}

const createClerkUser = async (user: User): Promise<string> => {
  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/create`, {
    method: "POST",
    body: JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      role: user.role,
      databaseId: user.id,
    }),
  })

  const { data } = (await response.json()) as { data: { id: string } }
  if (!data?.id) throw new Error("Failed to create user on Clerk")

  return data.id
}

const updateUserWithClerkId = async (database: typeof db, userId: string, clerkId: string): Promise<User> => {
  const [updatedUser] = await database.update(users).set({ clerkId }).where(eq(users.id, userId)).returning()
  if (!updatedUser) throw new Error("Failed to update user")

  return updatedUser
}
