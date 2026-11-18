import { TRPCError } from "@trpc/server"
import { and, eq, inArray, isNull } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import { type UserInsert, type UserSelect, users } from "@/server/db/schema"
import { normalizeUserInsert } from "@/utils/users"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"

type UsersUpdateInput = Partial<UserInsert> & { id?: string | null }

const ADMIN_OR_FC_ROLES: string[] = [RolesEnum.WFC_ADMIN, RolesEnum.SALES_REPRESENTATIVE]

const guardEmailChange = async ({ database, existingUser }: { database: typeof db; existingUser: UserSelect }) => {
  if (ADMIN_OR_FC_ROLES.includes(existingUser.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "WFC Admin / Fundraising Consultant email cannot be changed here.",
    })
  }

  if (existingUser.role === RolesEnum.PARENT && existingUser.clerkId) {
    const adminOrFcSibling = await database.query.users.findFirst({
      where: and(
        clerkIdentityMatchesDrizzle(existingUser.clerkId),
        inArray(users.role, ADMIN_OR_FC_ROLES),
        isNull(users.deletedAt)
      ),
    })
    if (adminOrFcSibling) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Use the verified email-change flow on the profile page to update this email.",
      })
    }
  }
}

export const usersUpdate = async ({ database, input }: { database: typeof db; input: UsersUpdateInput }) => {
  if (!input.id) throw new Error("User id is required for update")

  if (input.email !== undefined) {
    const existingUser = await database.query.users.findFirst({ where: eq(users.id, input.id) })
    if (existingUser && existingUser.email !== input.email) {
      await guardEmailChange({ database, existingUser })
    }
  }

  const normalizedInput = normalizeUserInsert({ ...input, id: input.id })

  const [updatedUser] = await database.update(users).set(normalizedInput).where(eq(users.id, input.id)).returning()
  if (!updatedUser) throw new Error("Failed to update user")

  if (updatedUser.clerkId) {
    await syncClerkProfile(updatedUser.clerkId, updatedUser)

    //sync other rows in users table
    await database
      .update(users)
      .set({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        fullName: updatedUser.fullName,
      })
      .where(clerkIdentityMatchesDrizzle(updatedUser.clerkId))
    return updatedUser
  }

  const hasContact = updatedUser.email != null || updatedUser.phone != null
  const shouldBackfillClerk = hasContact && updatedUser.status === UsersStatusEnum.ACTIVE && !updatedUser.clerkId

  if (shouldBackfillClerk) {
    return createClerkUserAndUpdateDb(database, updatedUser)
  }

  return updatedUser
}

async function syncClerkProfile(
  clerkId: string,
  user: {
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    role: UserSelect["role"]
  }
): Promise<void> {
  await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${clerkId}`, {
    method: "PUT",
    body: JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user?.phone ?? null,
      role: user.role,
    }),
  })
}

async function createClerkUserAndUpdateDb(database: typeof db, user: UserSelect): Promise<UserSelect> {
  const clerkCreationResponse = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/create`, {
    method: "POST",
    body: JSON.stringify({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      databaseId: user.id,
    }),
  })
  const { data } = (await clerkCreationResponse.json()) as {
    data: { id: string }
  }
  if (!data.id) throw new Error("Failed to create user")

  const [updatedUser] = await database.update(users).set({ clerkId: data.id }).where(eq(users.id, user.id)).returning()

  if (!updatedUser) throw new Error("User not updated after Clerk creation")
  return updatedUser
}
