import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { paymentLogs } from "@/server/db/schema"
import { participantNamesAccessGetStatus } from "@/server/services/participant-names-access"
import {
  paymentLogsCreate,
  paymentLogsDelete,
  paymentLogsDownloadReportByCampaignId,
  paymentLogsGetTotalByPaymentMethodAndWeekday,
  paymentLogsListByCampaignId,
  paymentLogsListByCampaignIdAndUserId,
  paymentLogsListByParentId,
  paymentLogsListByUserId,
  paymentLogsUpdate,
} from "@/server/services/payment-logs"
import { shouldMaskParticipantPii } from "@/utils/users"

const paymentLogsInsertSchema = createInsertSchema(paymentLogs)
const paymentLogsUpdateSchema = createUpdateSchema(paymentLogs)

export const paymentLogsRouter = createTRPCRouter({
  create: publicProcedure.input(paymentLogsInsertSchema).mutation(async ({ ctx, input }) => {
    return paymentLogsCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(paymentLogsUpdateSchema).mutation(async ({ ctx, input }) => {
    return paymentLogsUpdate({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return paymentLogsDelete({ database: ctx.db, input })
  }),

  getTotalByPaymentMethodAndWeekday: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return paymentLogsGetTotalByPaymentMethodAndWeekday({ database: ctx.db, input })
    }),

  listByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return paymentLogsListByCampaignId({
      database: ctx.db,
      input: { ...input, statuses: [PaymentLogsStatusEnum.COMPLETED, PaymentLogsStatusEnum.PENDING] },
    })
  }),

  listByCampaignIdAndUserId: publicProcedure
    .input(z.object({ userId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return paymentLogsListByCampaignIdAndUserId({ database: ctx.db, input })
    }),

  listByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return paymentLogsListByUserId({ database: ctx.db, input })
  }),

  listByParentId: publicProcedure.input(z.object({ parentId: z.string() })).query(async ({ ctx, input }) => {
    return paymentLogsListByParentId({ database: ctx.db, input })
  }),

  downloadReportByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        timezone: z.string().optional(),
        type: z.array(z.string()).optional(),
        participantSearch: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let maskParticipantPii = shouldMaskParticipantPii(ctx.userRole ?? undefined)
      if (ctx.userRole === RolesEnum.SALES_REPRESENTATIVE && ctx.userId) {
        const { isGranted } = await participantNamesAccessGetStatus({
          database: ctx.db,
          campaignId: input.campaignId,
          fundraiserUserId: ctx.userId,
        })
        maskParticipantPii = !isGranted
      }
      return paymentLogsDownloadReportByCampaignId({
        database: ctx.db,
        input,
        maskParticipantPii,
      })
    }),
})
