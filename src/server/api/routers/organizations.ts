import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { PAGINATION_AND_ORDER_BY_SCHEMA } from "@/constants/database"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { organizations } from "@/server/db/schema"
import {
  organizationsCheckDuplicateByAccountNumber,
  organizationsCreate,
  organizationsDelete,
  organizationsFCOnboardingState,
  organizationsGetById,
  organizationsGetByIdWithUsers,
  organizationsGetStripeAccountStatus,
  organizationsListByUserId,
  organizationsListPaginated,
  organizationsListPaginatedFromUserId,
  organizationsSearchSFAccounts,
  organizationsUpdate,
} from "@/server/services/organizations"

const organizationsInsertSchema = createInsertSchema(organizations)
const organizationsUpdateSchema = createUpdateSchema(organizations)

export const organizationsRouter = createTRPCRouter({
  create: publicProcedure.input(organizationsInsertSchema).mutation(async ({ ctx, input }) => {
    return organizationsCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(organizationsUpdateSchema).mutation(async ({ ctx, input }) => {
    return organizationsUpdate({ database: ctx.db, input, updatedByUserId: ctx.userId ?? undefined })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return organizationsDelete({ database: ctx.db, input })
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return organizationsGetById({ database: ctx.db, input })
  }),

  getByIdWithUsers: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return organizationsGetByIdWithUsers({ database: ctx.db, input })
  }),

  listByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return organizationsListByUserId({ database: ctx.db, input })
  }),

  listPaginated: publicProcedure
    .input(
      PAGINATION_AND_ORDER_BY_SCHEMA.extend({
        search: z.string().optional(),
        searchBy: z.enum(["name", "accountNumber"]).optional(),
        adminUserId: z.string().optional(),
        createdByUserId: z.string().optional(),
        stripeConnectedAccount: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return organizationsListPaginated({ database: ctx.db, input })
    }),

  listPaginatedFromUserId: publicProcedure
    .input(
      PAGINATION_AND_ORDER_BY_SCHEMA.extend({
        userId: z.string(),
        role: z.enum(RolesEnum).optional(),
        search: z.string().optional(),
        searchBy: z.enum(["name", "accountNumber"]).optional(),
        adminUserId: z.string().optional(),
        createdByUserId: z.string().optional(),
        stripeConnectedAccount: z.boolean().optional(),
        fundraisingConsultantUserId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return organizationsListPaginatedFromUserId({ database: ctx.db, input })
    }),

  fcOnboardingState: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return organizationsFCOnboardingState({ database: ctx.db, input })
  }),

  getOrgsListfromSF: publicProcedure
    .input(
      z.object({
        searchMode: z.string(),
        searchValue: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return organizationsSearchSFAccounts({
        searchMode: input.searchMode,
        searchValue: input.searchValue,
        userId: ctx.userId ?? undefined,
        userRole: ctx.userRole ?? undefined,
        database: ctx.db,
      })
    }),

  getStripeAccountStatus: publicProcedure
    .input(
      z.object({
        stripeAccountId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return organizationsGetStripeAccountStatus(input)
    }),

  checkDuplicateByAccountNumber: publicProcedure
    .input(z.object({ accountNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      return organizationsCheckDuplicateByAccountNumber({
        accountNumber: input.accountNumber,
        database: ctx.db,
      })
    }),
})
