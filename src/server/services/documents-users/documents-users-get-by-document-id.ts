import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documentsUsers } from "@/server/db/schema"

export const documentsUsersGetByDocumentId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { documentId: string }
}) => {
  return database.select().from(documentsUsers).where(eq(documentsUsers.documentId, input.documentId))
}
