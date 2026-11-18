import type { db } from "@/server/db"
import { type CasesTransactionInsert, type CasesTransactionSelect, casesTransactions } from "@/server/db/schema"

export const casesTransactionsCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: CasesTransactionInsert
}): Promise<CasesTransactionSelect | undefined> => {
  const [transaction] = await database.insert(casesTransactions).values(input).returning()
  return transaction
}
