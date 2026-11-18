import type { db } from "@/server/db"
import { type DocumentUserInsert, type DocumentUserSelect, documentsUsers } from "@/server/db/schema"

export const documentsUsersCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: DocumentUserInsert
}): Promise<DocumentUserSelect | undefined> => {
  const [documentUser] = await database.insert(documentsUsers).values(input).returning()
  return documentUser
}
