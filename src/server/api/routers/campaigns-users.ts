import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import z from "zod"

import { PAGINATION_AND_ORDER_BY_SCHEMA } from "@/constants/database"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { campaignsUsers } from "@/server/db/schema"
import {
  campaignsUsersCreate,
  campaignsUsersDelete,
  campaignsUsersDeleteMany,
  campaignsUsersDownloadReportByCampaignId,
  campaignsUsersGetByEmailOrPhone,
  campaignsUsersListByCampaignId,
  campaignsUsersListByUserIds,
  campaignsUsersListChocolateRequestAlerts,
  campaignsUsersListGradesByCampaignId,
  campaignsUsersListPaginatedByCampaignId,
  campaignsUsersListTeacherNamesByCampaignId,
  campaignsUsersListUserIdsByCampaignId,
  campaignsUsersListWithoutCheckoutByParentId,
  campaignsUsersSignManyPermissionSlip,
  campaignsUsersSignPermissionSlip,
  campaignsUsersUnsignPermissionSlip,
  campaignsUsersUpdate,
  campaignsUsersUpsertMany,
} from "@/server/services/campaigns-users"
import { participantNamesAccessGetStatus } from "@/server/services/participant-names-access"
import { shouldMaskParticipantPii } from "@/utils/users"

const campaignsUsersInsertSchema = createInsertSchema(campaignsUsers)
const campaignsUsersUpdateSchema = createUpdateSchema(campaignsUsers)

export const campaignsUsersRouter = createTRPCRouter({
  create: publicProcedure.input(campaignsUsersInsertSchema).mutation(async ({ ctx, input }) => {
    return campaignsUsersCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(campaignsUsersUpdateSchema).mutation(async ({ ctx, input }) => {
    return campaignsUsersUpdate({ database: ctx.db, input })
  }),

  upsertMany: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        campaignId: z.string(),
        userIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return campaignsUsersUpsertMany({ database: ctx.db, input })
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return campaignsUsersDelete({ database: ctx.db, input })
  }),

  deleteMany: publicProcedure.input(z.object({ ids: z.array(z.string()) })).mutation(async ({ ctx, input }) => {
    return campaignsUsersDeleteMany({ database: ctx.db, input })
  }),

  signPermissionSlip: publicProcedure
    .input(z.object({ id: z.string(), campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsUsersSignPermissionSlip({ database: ctx.db, input })
    }),

  unsignPermissionSlip: publicProcedure
    .input(z.object({ id: z.string(), campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsUsersUnsignPermissionSlip({ database: ctx.db, input })
    }),

  signManyPermissionSlip: publicProcedure
    .input(z.object({ ids: z.array(z.string()), campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsUsersSignManyPermissionSlip({ database: ctx.db, input })
    }),

  getByEmailOrPhone: publicProcedure
    .input(z.object({ campaignId: z.string(), email: z.string().optional(), phone: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return campaignsUsersGetByEmailOrPhone({ database: ctx.db, input })
    }),

  listByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsUsersListByCampaignId({ database: ctx.db, input })
  }),

  listPaginatedByCampaignId: publicProcedure
    .input(
      PAGINATION_AND_ORDER_BY_SCHEMA.extend({
        campaignId: z.string(),
        organizationId: z.string(),
        search: z.string().optional(),
        grade: z.string().optional(),
        teacherName: z.string().optional(),
        permissionSlipSigned: z.boolean().optional(),
        eligible: z.boolean().optional(),
        parentUserStatus: z.nativeEnum(UsersStatusEnum).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsUsersListPaginatedByCampaignId({ database: ctx.db, input })
    }),

  listWithoutCheckoutByParentId: publicProcedure
    .input(z.object({ parentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsUsersListWithoutCheckoutByParentId({ database: ctx.db, input })
    }),

  listGradesByCampaignId: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsUsersListGradesByCampaignId({ database: ctx.db, input })
  }),

  listTeacherNamesByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsUsersListTeacherNamesByCampaignId({ database: ctx.db, input })
    }),

  listUserIdsByCampaignId: publicProcedure
    .input(
      z.object({
        campaignId: z.string(),
        organizationId: z.string(),
        search: z.string().optional(),
        grade: z.string().optional(),
        teacherName: z.string().optional(),
        permissionSlipSigned: z.boolean().optional(),
        eligible: z.boolean().optional(),
        parentUserStatus: z.nativeEnum(UsersStatusEnum).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsUsersListUserIdsByCampaignId({ database: ctx.db, input })
    }),

  listByUserIds: publicProcedure.input(z.object({ userIds: z.array(z.string()) })).query(async ({ ctx, input }) => {
    return campaignsUsersListByUserIds({ database: ctx.db, input })
  }),

  listChocolateRequestAlertsByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsUsersListChocolateRequestAlerts({ database: ctx.db, input })
    }),

  downloadReportByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string(), startDate: z.date().optional(), endDate: z.date().optional() }))
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
      return campaignsUsersDownloadReportByCampaignId({ database: ctx.db, input, maskParticipantPii })
    }),
})
