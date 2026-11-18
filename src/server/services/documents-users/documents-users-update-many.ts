import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DocumentUserInsert, documentsUsers } from "@/server/db/schema"

export const documentsUsersUpdateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: (Partial<DocumentUserInsert> & { id?: string | null })[]
}) => {
  const results = await Promise.all(
    input.map(documentUser =>
      database.update(documentsUsers).set(documentUser).where(eq(documentsUsers.id, documentUser.id!)).returning()
    )
  )
  return results
}
