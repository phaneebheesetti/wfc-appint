import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { DELIVERY_NOTIFICATION_MAX_LENGTH } from "@/constants/consumer-payment-logs"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { type db } from "@/server/db"
import {
  consumerPaymentLogsGetOrderSummaryByDigitalSalesId,
  consumerPaymentLogsGetOrdersByDigitalSalesId,
  consumerPaymentLogsGetPendingOrdersSummaryByDigitalSalesId,
  consumerPaymentLogsMarkDelivered,
} from "@/server/services/consumer-payment-logs"
import {
  digitalSalesInformationGetByParticipantAndFundraiser,
  digitalSalesInformationVerifyParent,
} from "@/server/services/digital-sales-information"

const participantInput = z.object({
  participantId: z.string(),
  fundraiserId: z.string(),
})
const ensureParentAndResolveSalesPage = async (
  database: typeof db,
  userId: string | null | undefined,
  input: { participantId: string; fundraiserId: string }
) => {
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" })

  const isParent = await digitalSalesInformationVerifyParent({
    database,
    parentUserId: userId,
    participantId: input.participantId,
  })
  if (!isParent) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not manage this participant." })
  }

  const salesPage = await digitalSalesInformationGetByParticipantAndFundraiser({ database, input })
  if (!salesPage) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This participant has no sales page yet." })
  }

  return { digitalSalesId: salesPage.id, actingUserId: userId }
}

export const consumerPaymentLogsRouter = createTRPCRouter({
  getOrderSummaryByDigitalSalesId: publicProcedure
    .input(z.object({ digitalSalesId: z.string() }))
    .query(async ({ ctx, input }) => {
      return consumerPaymentLogsGetOrderSummaryByDigitalSalesId({
        database: ctx.db,
        digitalSalesId: input.digitalSalesId,
      })
    }),

  getPendingOrdersSummaryByDigitalSalesId: publicProcedure
    .input(z.object({ digitalSalesId: z.string() }))
    .query(async ({ ctx, input }) => {
      return consumerPaymentLogsGetPendingOrdersSummaryByDigitalSalesId({
        database: ctx.db,
        digitalSalesId: input.digitalSalesId,
      })
    }),

  getOrders: publicProcedure.input(participantInput).query(async ({ ctx, input }) => {
    const { digitalSalesId } = await ensureParentAndResolveSalesPage(ctx.db, ctx.userId, input)
    return consumerPaymentLogsGetOrdersByDigitalSalesId({ database: ctx.db, digitalSalesId })
  }),

  markDelivered: publicProcedure
    .input(
      participantInput.extend({
        consumerPaymentLogId: z.string(),
        message: z.string().trim().min(1).max(DELIVERY_NOTIFICATION_MAX_LENGTH),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { digitalSalesId, actingUserId } = await ensureParentAndResolveSalesPage(ctx.db, ctx.userId, input)
      return consumerPaymentLogsMarkDelivered({
        database: ctx.db,
        input: {
          consumerPaymentLogId: input.consumerPaymentLogId,
          digitalSalesId,
          actingUserId,
          message: input.message,
        },
      })
    }),
})
