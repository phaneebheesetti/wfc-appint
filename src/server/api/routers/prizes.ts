import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { prizes } from "@/server/db/schema"
import { participantNamesAccessGetStatus } from "@/server/services/participant-names-access"
import {
  prizesApplyTemplate,
  prizesCreate,
  prizesDelete,
  prizesDownloadReportByCampaignId,
  prizesGetPrizeByUserId,
  prizesListByCampaignId,
  prizesListByUserId,
  prizesUpdate,
} from "@/server/services/prizes"
import { shouldMaskParticipantPii } from "@/utils/users"

const prizesInsertSchema = createInsertSchema(prizes).omit({ prizeTemplateSlug: true })
const prizesUpdateSchema = createUpdateSchema(prizes).omit({ prizeTemplateSlug: true })

export const prizesRouter = createTRPCRouter({
  create: publicProcedure.input(prizesInsertSchema).mutation(async ({ ctx, input }) => {
    return prizesCreate({ database: ctx.db, input })
  }),

  applyTemplate: publicProcedure
    .input(z.object({ campaignId: z.string(), prizeTemplateSlug: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      return prizesApplyTemplate({ database: ctx.db, input })
    }),

  update: publicProcedure.input(prizesUpdateSchema).mutation(async ({ ctx, input }) => {
    return prizesUpdate({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return prizesDelete({ database: ctx.db, input })
  }),

  getCurrentPrizeByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        campaignId: z.string().optional(),
        type: z.literal("current").default("current"),
      })
    )
    .query(async ({ ctx, input }) => {
      return prizesGetPrizeByUserId({ database: ctx.db, input })
    }),

  getNextPrizeByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        campaignId: z.string().optional(),
        type: z.literal("next").default("next"),
      })
    )
    .query(async ({ ctx, input }) => {
      return prizesGetPrizeByUserId({ database: ctx.db, input })
    }),

  listByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return prizesListByCampaignId({ database: ctx.db, input })
  }),

  listByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return prizesListByUserId({ database: ctx.db, input })
  }),

  downloadReportByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
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
      return prizesDownloadReportByCampaignId({ database: ctx.db, input, maskParticipantPii })
    }),
})
