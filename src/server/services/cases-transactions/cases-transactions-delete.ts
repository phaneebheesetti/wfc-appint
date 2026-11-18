import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

export const casesTransactionsDelete = async ({ database, input }: { database: typeof db; input: { id: string } }) => {
  await database.delete(casesTransactions).where(eq(casesTransactions.id, input.id))
}
