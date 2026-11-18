import { and, eq, isNull, sql } from "drizzle-orm"

import type { RolesEnum } from "@/constants/roles"
import type { db } from "@/server/db"
import { users } from "@/server/db/schema"

export const usersAcceptTerms = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string; role: RolesEnum }
}) => {
  const user = await database.query.users.findFirst({
    where: eq(users.id, input.id),
    columns: { email: true },
  })
  const email = user?.email?.trim().toLowerCase()
  if (!email) return

  await database
    .update(users)
    .set({
      acceptedTermsAndConditions: true,
      termsAcceptedAt: new Date(),
      termsAcceptedVersion: "v1.0.0",
      updatedAt: new Date(),
    })
    .where(and(isNull(users.deletedAt), eq(users.role, input.role), sql`lower(${users.email}) = ${email}`))
}
