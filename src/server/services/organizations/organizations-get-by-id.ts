import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations } from "@/server/db/schema"

export const organizationsGetById = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  const organization = await database.query.organizations.findFirst({
    where: eq(organizations.id, input.id),
    with: {
      createdByUser: true,
      adminUser: true,
    },
  })

  return organization ?? null
}
