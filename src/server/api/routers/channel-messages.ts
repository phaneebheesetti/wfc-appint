import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { channelMessages } from "@/server/db/schema/channel-messages"
import {
  channelMessagesCreate,
  channelMessagesCreateMany,
  channelMessagesGetByChannelId,
  channelMessagesGetCountFromMyOrgs,
  channelMessagesGetCountFromUserId,
  channelMessagesGetLastMessage,
} from "@/server/services/channel-messages"

const channelMessagesInsertSchema = createInsertSchema(channelMessages)

export const channelMessagesRouter = createTRPCRouter({
  create: publicProcedure.input(channelMessagesInsertSchema).mutation(async ({ ctx, input }) => {
    return channelMessagesCreate({ database: ctx.db, input })
  }),

  createMany: publicProcedure
    .input(z.object({ channelIds: z.array(z.string()), content: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return channelMessagesCreateMany({ database: ctx.db, input })
    }),

  getLastMessage: publicProcedure.input(z.object({ channelId: z.string() })).query(async ({ ctx, input }) => {
    return channelMessagesGetLastMessage({ database: ctx.db, input })
  }),

  getCountFromUserId: publicProcedure
    .input(z.object({ userId: z.string(), role: z.enum(RolesEnum) }))
    .query(async ({ ctx, input }) => {
      return channelMessagesGetCountFromUserId({ database: ctx.db, input })
    }),

  getCountFromMyOrgs: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return channelMessagesGetCountFromMyOrgs({ database: ctx.db, input })
  }),

  getByChannelId: publicProcedure.input(z.object({ channelId: z.string() })).query(async ({ ctx, input }) => {
    return channelMessagesGetByChannelId({ database: ctx.db, input })
  }),
})
