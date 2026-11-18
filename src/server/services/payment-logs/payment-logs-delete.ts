import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { type PaymentLogSelect, paymentLogs } from "@/server/db/schema"

export const paymentLogsDelete = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string }
}): Promise<PaymentLogSelect | undefined> => {
  const [updatedPaymentLog] = await database
    .update(paymentLogs)
    .set({ deletedAt: new Date() })
    .where(eq(paymentLogs.id, input.id))
    .returning()
  return updatedPaymentLog
}
