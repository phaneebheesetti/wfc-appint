import type { db } from "@/server/db"
import { type DocumentInsert, type DocumentSelect, documents } from "@/server/db/schema"

export const documentsCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: DocumentInsert
}): Promise<DocumentSelect | undefined> => {
  const [document] = await database.insert(documents).values(input).returning()
  return document
}
