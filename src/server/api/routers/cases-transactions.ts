import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { casesTransactions } from "@/server/db/schema"
import {
  casesTransactionsCreate,
  casesTransactionsCreateMany,
  casesTransactionsDelete,
  casesTransactionsDownloadReportByCampaignId,
  casesTransactionsForParentByUserCampaigns,
  casesTransactionsGetAggregatedByParentId,
  casesTransactionsGetAllFromParentId,
  casesTransactionsGetAllFromUser,
  casesTransactionsGetAllFromUserAtCampaign,
  casesTransactionsGetAllFromUserOnActiveCampaigns,
  casesTransactionsGetAnalyticsAvgCasesPerParticipant,
  casesTransactionsGetByCampaignId,
  casesTransactionsGetBySFOrderId,
  casesTransactionsGetCurrentInventory,
  casesTransactionsGetDailyCasesCheckedOut,
  casesTransactionsGetSummaryByCampaignId,
  casesTransactionsUpdate,
} from "@/server/services/cases-transactions"
import { participantNamesAccessGetStatus } from "@/server/services/participant-names-access"
import { shouldMaskParticipantPii } from "@/utils/users"

const casesTransactionsInsertSchema = createInsertSchema(casesTransactions)
const casesTransactionsUpdateSchema = createUpdateSchema(casesTransactions)

export const casesTransactionsRouter = createTRPCRouter({
  create: publicProcedure.input(casesTransactionsInsertSchema).mutation(async ({ ctx, input }) => {
    return casesTransactionsCreate({ database: ctx.db, input })
  }),

  createMany: publicProcedure.input(z.array(casesTransactionsInsertSchema)).mutation(async ({ ctx, input }) => {
    return casesTransactionsCreateMany({ database: ctx.db, input })
  }),

  update: publicProcedure.input(casesTransactionsUpdateSchema).mutation(async ({ ctx, input }) => {
    return casesTransactionsUpdate({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return casesTransactionsDelete({ database: ctx.db, input })
  }),

  getAnalyticsAvgCasesPerParticipant: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return casesTransactionsGetAnalyticsAvgCasesPerParticipant({ database: ctx.db, input })
    }),

  getCurrentInventory: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetCurrentInventory({ database: ctx.db, input })
  }),

  getDailyCasesCheckedOut: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        groupBy: z.enum(["day", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      return casesTransactionsGetDailyCasesCheckedOut({ database: ctx.db, input })
    }),

  getByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetByCampaignId({ database: ctx.db, input })
  }),

  getBySFId: publicProcedure.input(z.object({ orderId: z.string() })).query(async ({ input }) => {
    return casesTransactionsGetBySFOrderId(input.orderId)
  }),

  getAllFromUserAtCampaign: publicProcedure
    .input(z.object({ userId: z.string(), campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return casesTransactionsGetAllFromUserAtCampaign({ database: ctx.db, input })
    }),

  getAllFromUser: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetAllFromUser({ database: ctx.db, input })
  }),

  getAllFromUserOnActiveCampaigns: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return casesTransactionsGetAllFromUserOnActiveCampaigns({ database: ctx.db, input })
    }),

  getAllFromParentId: publicProcedure.input(z.object({ parentId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetAllFromParentId({ database: ctx.db, input })
  }),

  getAggregatedByParentId: publicProcedure.input(z.object({ parentId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetAggregatedByParentId({ database: ctx.db, input })
  }),

  getUserCampaignsByParentId: publicProcedure
    .input(z.object({ parentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return casesTransactionsForParentByUserCampaigns({ database: ctx.db, input })
    }),

  getSummaryByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return casesTransactionsGetSummaryByCampaignId({ database: ctx.db, input })
  }),

  downloadReportByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        timezone: z.string().optional(),
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
      return casesTransactionsDownloadReportByCampaignId({ database: ctx.db, input, maskParticipantPii })
    }),
})
