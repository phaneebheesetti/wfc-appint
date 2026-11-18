import type { db } from "@/server/db"
import { type CasesTransactionInsert, type CasesTransactionSelect, casesTransactions } from "@/server/db/schema"

export const casesTransactionsCreateMany = async ({
  database,
  input,
}: {
  database: typeof db
  input: CasesTransactionInsert[]
}): Promise<CasesTransactionSelect[]> => {
  const transactions = await database.insert(casesTransactions).values(input).returning()
  return transactions
}
