import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

export const casesTransactionsGetAllFromUser = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  return database.query.casesTransactions.findMany({
    where: eq(casesTransactions.userId, input.userId),
    orderBy: (casesTransactions, { desc }) => [desc(casesTransactions.createdAt)],
  })
}
