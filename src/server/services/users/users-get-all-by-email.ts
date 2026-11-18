import { sql } from "drizzle-orm"

import { db } from "@/server/db"
import { type UserSelect, users } from "@/server/db/schema"
import { hasValue } from "@/utils/string"

// Reads via the global db so multi-role lookups bypass tRPC's SET ROLE
// authenticated RLS context and can see sibling rows on other users.
// Email comparison is case-insensitive so the re-invite block at
// usersFindUpdateOrInvite picks up rows deleted with mixed-case emails
// (legacy data) — otherwise a soft-deleted "User@Example.com" wouldn't
// match the lower-cased re-invite input and the CONFLICT throw would be
// bypassed.
export const usersGetAllByEmail = async ({ input }: { input: { email?: string | null } }): Promise<UserSelect[]> => {
  const { email } = input
  if (!hasValue(email)) return []

  const normalizedEmail = email!.trim().toLowerCase()

  return db.query.users.findMany({
    where: sql`lower(${users.email}) = ${normalizedEmail}`,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  })
}
