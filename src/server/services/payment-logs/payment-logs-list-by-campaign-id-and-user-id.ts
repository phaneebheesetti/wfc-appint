import { and, eq, isNull } from "drizzle-orm"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { paymentLogs } from "@/server/db/schema"

export const paymentLogsListByCampaignIdAndUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId: string }
}) => {
  return database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.userId, input.userId),
      eq(paymentLogs.campaignId, input.campaignId),
      eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
      isNull(paymentLogs.deletedAt)
    ),
    orderBy: (paymentLogs, { desc }) => [desc(paymentLogs.createdAt)],
  })
}
