import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { documentsUsers } from "@/server/db/schema"
import {
  documentsUsersCreate,
  documentsUsersCreateMany,
  documentsUsersDelete,
  documentsUsersDownloadReportByCampaignId,
  documentsUsersDownloadReportByDocumentId,
  documentsUsersGetByDocumentId,
  documentsUsersGetById,
  documentsUsersGetByUserId,
  documentsUsersListFromParentId,
  documentsUsersSignDocument,
  documentsUsersUpdate,
  documentsUsersUpdateMany,
} from "@/server/services/documents-users"
import { participantNamesAccessGetStatus } from "@/server/services/participant-names-access"
import { shouldMaskParticipantPii } from "@/utils/users"

const documentsUsersInsertSchema = createInsertSchema(documentsUsers)
const documentsUsersUpdateSchema = createUpdateSchema(documentsUsers)

export const documentsUsersRouter = createTRPCRouter({
  create: publicProcedure.input(documentsUsersInsertSchema).mutation(async ({ ctx, input }) => {
    return documentsUsersCreate({ database: ctx.db, input })
  }),

  createMany: publicProcedure.input(z.array(documentsUsersInsertSchema)).mutation(async ({ ctx, input }) => {
    return documentsUsersCreateMany({ database: ctx.db, input })
  }),

  update: publicProcedure.input(documentsUsersUpdateSchema).mutation(async ({ ctx, input }) => {
    return documentsUsersUpdate({ database: ctx.db, input })
  }),

  updateMany: publicProcedure.input(z.array(documentsUsersUpdateSchema)).mutation(async ({ ctx, input }) => {
    return documentsUsersUpdateMany({ database: ctx.db, input })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return documentsUsersDelete({ database: ctx.db, input })
  }),

  signDocument: publicProcedure
    .input(
      z.object({
        id: z.string(),
        metadata: z.record(z.string(), z.string()),
        userId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return documentsUsersSignDocument({ database: ctx.db, input })
    }),

  getById: publicProcedure.input(z.object({ id: z.string(), userId: z.string() })).query(async ({ ctx, input }) => {
    return documentsUsersGetById({ database: ctx.db, input })
  }),

  getByDocumentId: publicProcedure.input(z.object({ documentId: z.string() })).query(async ({ ctx, input }) => {
    return documentsUsersGetByDocumentId({ database: ctx.db, input })
  }),

  getByUserId: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(DocumentsUsersStatusEnum),
      })
    )
    .query(async ({ ctx, input }) => {
      return documentsUsersGetByUserId({ database: ctx.db, input })
    }),

  listFromParentId: publicProcedure
    .input(
      z.object({
        parentId: z.string(),
        status: z.enum(DocumentsUsersStatusEnum),
      })
    )
    .query(async ({ ctx, input }) => {
      return documentsUsersListFromParentId({ database: ctx.db, input })
    }),

  downloadReportByDocumentId: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        timezone: z.string().optional(),
        campaignId: z.string(),
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
      return documentsUsersDownloadReportByDocumentId({ database: ctx.db, input, maskParticipantPii })
    }),

  downloadReportByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
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
      return documentsUsersDownloadReportByCampaignId({ database: ctx.db, input, maskParticipantPii })
    }),
})
