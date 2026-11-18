import type { db } from "@/server/db"
import { type CasesTransactionInsert } from "@/server/db/schema"

import { casesTransactionsUpdateWithChildren } from "./cases-transactions-update-with-children"

export const casesTransactionsUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<CasesTransactionInsert> & { id?: string | null }
}) => {
  return casesTransactionsUpdateWithChildren({
    database,
    input: { ...input, id: input.id! },
  })
}
