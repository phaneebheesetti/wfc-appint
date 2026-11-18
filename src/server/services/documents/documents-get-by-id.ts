import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DocumentSelect, documents } from "@/server/db/schema"

export const documentsGetById = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string }
}): Promise<DocumentSelect | undefined> => {
  const [document] = await database.select().from(documents).where(eq(documents.id, input.id))
  return document
}
