import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { documents } from "@/server/db/schema"
import {
  documentsCreate,
  documentsDelete,
  documentsGetById,
  documentsListByCampaignId,
  documentsUpdate,
} from "@/server/services/documents"

const documentsInsertSchema = createInsertSchema(documents)
const documentsUpdateSchema = createUpdateSchema(documents)

export const documentsRouter = createTRPCRouter({
  create: publicProcedure.input(documentsInsertSchema).mutation(async ({ ctx, input }) => {
    return documentsCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(documentsUpdateSchema).mutation(async ({ ctx, input }) => {
    return documentsUpdate({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return documentsDelete({ database: ctx.db, input })
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return documentsGetById({ database: ctx.db, input })
  }),

  listByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return documentsListByCampaignId({ database: ctx.db, input })
  }),
})
