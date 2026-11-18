import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { type db } from "@/server/db"
import {
  digitalSalesInformationGetByParticipantAndFundraiser,
  digitalSalesInformationSaveInventory,
  digitalSalesInformationToggleSalesPage,
  digitalSalesInformationUpsertMessage,
  digitalSalesInformationVerifyParent,
} from "@/server/services/digital-sales-information"

const MESSAGE_MAX_LENGTH = 280

const baseInput = z.object({
  participantId: z.string(),
  fundraiserId: z.string(),
})

/** Digital Sales is managed only by a parent of the participant. */
const ensureParent = async (database: typeof db, userId: string | null | undefined, participantId: string) => {
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" })
  const isParent = await digitalSalesInformationVerifyParent({ database, parentUserId: userId, participantId })
  if (!isParent) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not manage this participant." })
  }
  return userId
}

export const digitalSalesInformationRouter = createTRPCRouter({
  getByParticipantAndFundraiser: publicProcedure.input(baseInput).query(async ({ ctx, input }) => {
    await ensureParent(ctx.db, ctx.userId, input.participantId)
    return digitalSalesInformationGetByParticipantAndFundraiser({ database: ctx.db, input })
  }),

  upsertMessage: publicProcedure
    .input(baseInput.extend({ message: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH) }))
    .mutation(async ({ ctx, input }) => {
      const actingUserId = await ensureParent(ctx.db, ctx.userId, input.participantId)
      return digitalSalesInformationUpsertMessage({ database: ctx.db, input: { ...input, actingUserId } })
    }),

  saveInventory: publicProcedure
    .input(
      baseInput
        .extend({
          casesCheckedOut: z.number().int().min(1),
          source: z.enum(["setup", "update"]),
          soldInPerson: z.number().int().min(0).optional(),
        })
        .refine(data => data.source !== "update" || data.soldInPerson !== undefined, {
          message: 'soldInPerson is required when source is "update"',
          path: ["soldInPerson"],
        })
    )
    .mutation(async ({ ctx, input }) => {
      const actingUserId = await ensureParent(ctx.db, ctx.userId, input.participantId)
      return digitalSalesInformationSaveInventory({ database: ctx.db, input: { ...input, actingUserId } })
    }),

  toggleSalesPage: publicProcedure
    .input(baseInput.extend({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const actingUserId = await ensureParent(ctx.db, ctx.userId, input.participantId)
      return digitalSalesInformationToggleSalesPage({ database: ctx.db, input: { ...input, actingUserId } })
    }),
})
