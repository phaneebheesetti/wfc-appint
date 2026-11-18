import { and, eq, inArray, isNull } from "drizzle-orm"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import type { db } from "@/server/db"
import { paymentLogs } from "@/server/db/schema"

export const paymentLogsListByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string; statuses?: PaymentLogsStatusEnum[] }
}) => {
  const paymentLogsData = await database.query.paymentLogs.findMany({
    where: and(
      eq(paymentLogs.campaignId, input.campaignId),
      inArray(paymentLogs.status, input.statuses ?? [PaymentLogsStatusEnum.COMPLETED]),
      isNull(paymentLogs.deletedAt)
    ),
    orderBy: (paymentLogs, { desc }) => [desc(paymentLogs.createdAt)],
    with: {
      user: true,
      createdByUser: true,
    },
  })

  return paymentLogsData
}
