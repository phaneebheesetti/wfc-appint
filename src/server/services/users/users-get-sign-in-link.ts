import { clerkClient } from "@clerk/nextjs/server"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersGetSignInLink = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const user = await database.query.users.findFirst({ where: eq(users.id, input.id) })

  if (!user?.clerkId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "User does not have a Clerk account yet" })
  }

  const client = await clerkClient()
  const signInToken = await client.signInTokens.createSignInToken({
    userId: user.clerkId,
    expiresInSeconds: 60 * 60 * 24 * 30, // 30 days
  })

  await database.update(users).set({ lastInviteSentAt: new Date() }).where(eq(users.id, user.id))

  return {
    url: `${env.NEXT_PUBLIC_APP_URL}/magic-signin?clerkId=${user.clerkId}&ticket=${signInToken.token}&role=${RolesEnum.PARENT}`,
  }
}
