import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { organizations } from "@/server/db/schema"

export const organizationsGetByIdWithUsers = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string }
}) => {
  const organization = await database.query.organizations.findFirst({
    where: eq(organizations.id, input.id),
    with: {
      organizationsUsers: true,
    },
  })

  return organization ?? null
}
