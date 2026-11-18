import { sql } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizationsUsers } from "@/server/db/schema"

export const organizationsUsersUpsertMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    organizationId: string
    users: { userId: string; eligible: boolean }[]
  }
}) => {
  const { organizationId, users } = input
  await database
    .insert(organizationsUsers)
    .values(
      users.map(user => ({
        userId: user.userId,
        organizationId,
        eligible: user.eligible,
      }))
    )
    .onConflictDoUpdate({
      target: [organizationsUsers.userId, organizationsUsers.organizationId],
      set: {
        userId: sql`excluded.user_id`,
        organizationId: sql`excluded.organization_id`,
        eligible: sql`excluded.eligible`,
      },
    })
}
