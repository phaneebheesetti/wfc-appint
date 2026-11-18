import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { CampaignAnnouncementTypeEnum } from "@/constants/campaign-announcements"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { campaignAnnouncements } from "@/server/db/schema"
import {
  campaignAnnouncementsCreate,
  campaignAnnouncementsListByCampaignId,
} from "@/server/services/campaign-announcements"

const campaignAnnouncementsInsertSchema = createInsertSchema(campaignAnnouncements)

export const campaignAnnouncementsRouter = createTRPCRouter({
  create: publicProcedure.input(campaignAnnouncementsInsertSchema).mutation(async ({ ctx, input }) => {
    return campaignAnnouncementsCreate({ database: ctx.db, input })
  }),

  listByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        excludeTypes: z
          .array(z.enum(CampaignAnnouncementTypeEnum))
          .optional()
          .default([CampaignAnnouncementTypeEnum.APP]),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignAnnouncementsListByCampaignId({ database: ctx.db, input })
    }),
})
