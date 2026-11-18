import { and, eq, inArray, isNull, ne } from "drizzle-orm"

import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { db } from "@/server/db"
import { organizations, organizationsUsers } from "@/server/db/schema"

export const organizationsGetAllFromUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const organizationsData = await database.query.organizations.findMany({
    where: and(
      isNull(organizations.deletedAt),
      ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
      inArray(
        organizations.id,
        database
          .select({ organizationId: organizationsUsers.organizationId })
          .from(organizationsUsers)
          .where(eq(organizationsUsers.userId, input.userId))
      )
    ),
    orderBy: (organizations, { asc }) => [asc(organizations.name)],
  })

  return organizationsData
}
