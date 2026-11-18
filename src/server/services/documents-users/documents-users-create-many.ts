import type { db } from "@/server/db"
import { type DocumentUserInsert, type DocumentUserSelect, documentsUsers } from "@/server/db/schema"

export const documentsUsersCreateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: DocumentUserInsert[]
}): Promise<DocumentUserSelect[]> => {
  const documentUsers = await database.insert(documentsUsers).values(input).returning()
  return documentUsers
}
