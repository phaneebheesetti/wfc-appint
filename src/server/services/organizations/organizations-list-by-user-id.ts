import { and, eq, inArray, ne } from "drizzle-orm"

import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { db } from "@/server/db"
import { organizations, organizationsUsers } from "@/server/db/schema"

export const organizationsListByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const organizationsData = await database.query.organizations.findMany({
    where: and(
      ne(organizations.visibility, OrganizationsVisibilityEnum.DRAFT),
      inArray(
        organizations.id,
        database
          .select({ organizationId: organizationsUsers.organizationId })
          .from(organizationsUsers)
          .where(eq(organizationsUsers.userId, input.userId))
      )
    ),
    orderBy: (organizations, { desc }) => [desc(organizations.createdAt)],
  })

  return organizationsData
}
