import type { db } from "@/server/db"
import { type PaymentLogInsert, type PaymentLogSelect, paymentLogs } from "@/server/db/schema"

export const paymentLogsCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: PaymentLogInsert
}): Promise<PaymentLogSelect | undefined> => {
  const [transaction] = await database.insert(paymentLogs).values(input).returning()
  return transaction
}
