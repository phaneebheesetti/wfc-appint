import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import {
  channelsListByUserId,
  channelsListByUsersIds,
  channelsListFromMyOrgs,
  channelsListFromParent,
} from "@/server/services/channels"

export const channelsRouter = createTRPCRouter({
  listByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return channelsListByUserId({ database: ctx.db, input })
  }),

  listByUsersIds: publicProcedure.input(z.object({ userIds: z.array(z.string()) })).query(async ({ ctx, input }) => {
    return channelsListByUsersIds({ database: ctx.db, input })
  }),

  listFromParent: publicProcedure
    .input(z.object({ userId: z.string(), loggedInRole: z.enum(RolesEnum) }))
    .query(async ({ ctx, input }) => {
      return channelsListFromParent({ database: ctx.db, input })
    }),

  listFromMyOrgs: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return channelsListFromMyOrgs({ database: ctx.db, input })
  }),
})
