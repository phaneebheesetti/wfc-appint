import z from "zod"

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import {
  participantParentMappingCreate,
  participantParentMappingDeleteByParticipantAndParent,
  participantParentMappingListByParticipantId,
  participantParentMappingListByParticipantIds,
} from "@/server/services/participant-parent-mapping"

export const participantParentMappingRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        parentUserId: z.string(),
        participantUserId: z.string(),
        createdByUserId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return participantParentMappingCreate({ database: ctx.db, input })
    }),

  listByParticipantId: publicProcedure
    .input(z.object({ participantUserId: z.string() }))
    .query(async ({ ctx, input }) => {
      return participantParentMappingListByParticipantId({ database: ctx.db, input })
    }),

  listByParticipantIds: publicProcedure
    .input(z.object({ participantUserIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      return participantParentMappingListByParticipantIds({ database: ctx.db, input })
    }),

  deleteByParticipantAndParent: publicProcedure
    .input(z.object({ participantUserId: z.string(), parentUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return participantParentMappingDeleteByParticipantAndParent({ database: ctx.db, input })
    }),
})
