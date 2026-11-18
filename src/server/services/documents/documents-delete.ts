import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documents, documentsUsers } from "@/server/db/schema"

export const documentsDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.transaction(async tx => {
    await tx.delete(documentsUsers).where(eq(documentsUsers.documentId, input.id))
    await tx.delete(documents).where(eq(documents.id, input.id))
  })
}
