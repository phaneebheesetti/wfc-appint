import { and, eq, isNull } from "drizzle-orm"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { paymentLogs } from "@/server/db/schema"

export const paymentLogsListByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string }
}) => {
  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.userId, input.userId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
    with: {
      user: true,
    },
    orderBy: (paymentLogs, { desc }) => [desc(paymentLogs.createdAt)],
  })

  return paymentLogsData
}
