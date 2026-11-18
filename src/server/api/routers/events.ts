import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { events } from "@/server/db/schema"
import {
  eventsCreate,
  eventsDelete,
  eventsGetEventByUserId,
  eventsListByCampaignId,
  eventsListByUserId,
  eventsUpdate,
} from "@/server/services/events"

const eventsInsertSchema = createInsertSchema(events)
const eventsUpdateSchema = createUpdateSchema(events)

export const eventsRouter = createTRPCRouter({
  create: publicProcedure.input(eventsInsertSchema).mutation(async ({ ctx, input }) => {
    return eventsCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(eventsUpdateSchema).mutation(async ({ ctx, input }) => {
    return eventsUpdate({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return eventsDelete({ database: ctx.db, input })
  }),

  getCurrentEventByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        campaignId: z.string().optional(),
        type: z.literal("current").default("current"),
      })
    )
    .query(async ({ ctx, input }) => {
      return eventsGetEventByUserId({ database: ctx.db, input })
    }),

  getNextEventByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        campaignId: z.string().optional(),
        type: z.literal("next").default("next"),
      })
    )
    .query(async ({ ctx, input }) => {
      return eventsGetEventByUserId({ database: ctx.db, input })
    }),

  listByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return eventsListByCampaignId({ database: ctx.db, input })
  }),

  listByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return eventsListByUserId({ database: ctx.db, input })
  }),
})
