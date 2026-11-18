import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type PaymentLogInsert, type PaymentLogSelect, paymentLogs } from "@/server/db/schema"

export const paymentLogsUpdate = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<PaymentLogInsert> & { id?: string | null }
}): Promise<PaymentLogSelect | undefined> => {
  const [transaction] = await database.update(paymentLogs).set(input).where(eq(paymentLogs.id, input.id!)).returning()
  return transaction
}
