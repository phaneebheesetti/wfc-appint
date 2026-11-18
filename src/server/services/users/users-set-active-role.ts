import { TRPCError } from "@trpc/server"
import { and, eq, isNull } from "drizzle-orm"

import { type RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

import { clerkIdentityMatchesDrizzle } from "./users-clerk-identity-match"

export const usersSetActiveRole = async ({
  database,
  input,
}: {
  database: typeof db
  input: { clerkId: string; role: RolesEnum }
}) => {
  const row = await database.query.users.findFirst({
    where: and(clerkIdentityMatchesDrizzle(input.clerkId), eq(users.role, input.role), isNull(users.deletedAt)),
    columns: { id: true, role: true },
  })

  if (!row) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this role",
    })
  }

  const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/${input.clerkId}/set-active-role`, {
    method: "POST",
    body: JSON.stringify({ role: input.role, databaseId: row.id }),
  })

  if (!response.ok) {
    throw new Error(`Failed to set active role on Clerk: ${response.status}`)
  }

  return { role: row.role as RolesEnum, databaseId: row.id }
}
