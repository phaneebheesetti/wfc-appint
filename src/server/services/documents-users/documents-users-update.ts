import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type DocumentUserInsert, type DocumentUserSelect, documentsUsers } from "@/server/db/schema"

export const documentsUsersUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<DocumentUserInsert> & { id?: string | null }
}): Promise<DocumentUserSelect | undefined> => {
  const [documentUser] = await database
    .update(documentsUsers)
    .set(input)
    .where(eq(documentsUsers.id, input.id!))
    .returning()
  return documentUser
}
