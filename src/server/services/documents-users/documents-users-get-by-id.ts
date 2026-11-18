import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documentsUsers } from "@/server/db/schema"

export const documentsUsersGetById = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string; userId: string }
}) => {
  const documentUserData = await database.query.documentsUsers.findFirst({
    where: eq(documentsUsers.id, input.id),
    with: {
      document: {
        with: {
          organization: true,
          campaign: true,
          event: true,
        },
      },
      user: true,
    },
  })
  return documentUserData
}
