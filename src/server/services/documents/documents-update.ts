import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DocumentInsert, type DocumentSelect, documents } from "@/server/db/schema"

export const documentsUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<DocumentInsert> & { id?: string | null }
}): Promise<DocumentSelect | undefined> => {
  const [document] = await database.update(documents).set(input).where(eq(documents.id, input.id!)).returning()
  return document
}
