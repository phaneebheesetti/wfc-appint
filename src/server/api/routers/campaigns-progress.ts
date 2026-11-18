import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import {
  campaignsProgressGetByCampaignId,
  campaignsProgressSetSetupProgress,
} from "@/server/services/campaigns-progress"

export const campaignsProgressRouter = createTRPCRouter({
  getByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsProgressGetByCampaignId({
        database: ctx.db,
        campaignId: input.campaignId,
      })
    }),

  setSetupProgress: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        key: z.enum(["stripeSaved", "prizesAndEventsSaved", "permissionSlipSaved", "finalReviewCompleted"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return campaignsProgressSetSetupProgress({
        database: ctx.db,
        input,
      })
    }),
})
