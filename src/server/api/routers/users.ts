import { auth } from "@clerk/nextjs/server"
import { TRPCError } from "@trpc/server"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import { PAGINATION_AND_ORDER_BY_SCHEMA } from "@/constants/database"
import { ONBOARDING_STEP_KEYS } from "@/constants/onboarding"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { users } from "@/server/db/schema"
import {
  usersAcceptTerms,
  usersCreate,
  usersCreateMany,
  usersDeactivate,
  usersDelete,
  usersEnsureClerkMetadata,
  usersFindUpdateOrCreate,
  usersFindUpdateOrCreateMany,
  usersFindUpdateOrInvite,
  usersFindUpdateOrInviteMany,
  usersGetById,
  usersGetSignInLink,
  usersInvite,
  usersInviteMany,
  usersListByEmailOrPhone,
  usersListByIds,
  usersListByParentId,
  usersListByRoles,
  usersListPaginated,
  usersReactivate,
  usersResendInvitationMany,
  usersSetActiveRole,
  usersSetOnboardingStep,
  usersUpdate,
  usersUpdateMany,
} from "@/server/services/users"

const usersInsertSchema = createInsertSchema(users)
const usersUpdateSchema = createUpdateSchema(users)

export const usersRouter = createTRPCRouter({
  create: publicProcedure.input(usersInsertSchema).mutation(async ({ ctx, input }) => {
    return usersCreate({ database: ctx.db, input })
  }),
  createMany: publicProcedure.input(z.array(usersInsertSchema)).mutation(async ({ ctx, input }) => {
    return usersCreateMany({ database: ctx.db, input })
  }),
  invite: publicProcedure.input(usersInsertSchema).mutation(async ({ ctx, input }) => {
    return usersInvite({ database: ctx.db, input })
  }),
  inviteMany: publicProcedure.input(z.array(usersInsertSchema)).mutation(async ({ ctx, input }) => {
    return usersInviteMany({ database: ctx.db, input })
  }),
  update: publicProcedure.input(usersUpdateSchema).mutation(async ({ ctx, input }) => {
    return usersUpdate({ database: ctx.db, input })
  }),
  setOnboardingStep: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        campaignId: z.string(),
        step: z.enum(ONBOARDING_STEP_KEYS),
        savedAt: z.string().nullable(),
        isCreatedFromOrganization: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return usersSetOnboardingStep({ database: ctx.db, input })
    }),
  updateMany: publicProcedure.input(z.array(usersUpdateSchema)).mutation(async ({ ctx, input }) => {
    return usersUpdateMany({ database: ctx.db, input })
  }),
  findUpdateOrCreate: publicProcedure.input(usersInsertSchema).mutation(async ({ ctx, input }) => {
    return usersFindUpdateOrCreate({ database: ctx.db, input })
  }),
  findUpdateOrCreateMany: publicProcedure.input(z.array(usersInsertSchema)).mutation(async ({ ctx, input }) => {
    return usersFindUpdateOrCreateMany({ database: ctx.db, input })
  }),
  findUpdateOrInvite: publicProcedure.input(usersInsertSchema).mutation(async ({ ctx, input }) => {
    return usersFindUpdateOrInvite({ database: ctx.db, input })
  }),
  findUpdateOrInviteMany: publicProcedure.input(z.array(usersInsertSchema)).mutation(async ({ ctx, input }) => {
    return usersFindUpdateOrInviteMany({ database: ctx.db, input })
  }),
  setActiveRole: publicProcedure.input(z.object({ role: z.enum(RolesEnum) })).mutation(async ({ ctx, input }) => {
    const { userId: clerkId } = await auth()
    if (!clerkId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" })
    return usersSetActiveRole({ database: ctx.db, input: { clerkId, role: input.role } })
  }),
  ensureClerkMetadata: publicProcedure.query(async () => {
    const { userId: clerkId } = await auth()
    if (!clerkId) return { backfilled: false }
    return usersEnsureClerkMetadata({ clerkId })
  }),
  deactivate: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return usersDeactivate({ database: ctx.db, input })
  }),
  reactivate: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return usersReactivate({ database: ctx.db, input })
  }),
  resendInvitationMany: publicProcedure
    .input(z.object({ userIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return usersResendInvitationMany({ database: ctx.db, input })
    }),
  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return usersDelete({ database: ctx.db, input })
  }),
  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return usersGetById({ database: ctx.db, input })
  }),
  getSignInLink: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return usersGetSignInLink({ database: ctx.db, input })
  }),
  listByIds: publicProcedure.input(z.object({ ids: z.array(z.string()) })).query(async ({ ctx, input }) => {
    return usersListByIds({ database: ctx.db, input })
  }),
  listPaginated: publicProcedure
    .input(
      PAGINATION_AND_ORDER_BY_SCHEMA.extend({
        search: z.string().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return usersListPaginated({ database: ctx.db, input })
    }),
  listByParentId: publicProcedure.input(z.object({ parentId: z.string() })).query(async ({ ctx, input }) => {
    return usersListByParentId({ database: ctx.db, input })
  }),
  listByEmailOrPhone: publicProcedure
    .input(
      z.object({
        emails: z.array(z.string()).optional().default([]),
        phones: z.array(z.string()).optional().default([]),
        roles: z.array(z.enum(RolesEnum)).optional().default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      return usersListByEmailOrPhone({ database: ctx.db, input })
    }),
  listByRoles: publicProcedure.input(z.object({ roles: z.array(z.enum(RolesEnum)) })).query(async ({ ctx, input }) => {
    return usersListByRoles({ database: ctx.db, input })
  }),
  acceptTermsAndConditions: publicProcedure
    .input(z.object({ id: z.string(), role: z.enum(RolesEnum) }))
    .mutation(async ({ ctx, input }) => {
      return usersAcceptTerms({ database: ctx.db, input })
    }),
})
