import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizationsUsers } from "@/server/db/schema"

export const organizationsUsersGetByUserAndOrganizationId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; organizationId: string }
}) => {
  const organizationUser = await database.query.organizationsUsers.findFirst({
    where: and(
      eq(organizationsUsers.userId, input.userId),
      eq(organizationsUsers.organizationId, input.organizationId)
    ),
  })

  return organizationUser ?? null
}
