import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import z from "zod"

import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { organizationsUsers } from "@/server/db/schema"
import {
  organizationsUsersCreate,
  organizationsUsersDelete,
  organizationsUsersDeleteWithReassign,
  organizationsUsersGetAdmin,
  organizationsUsersGetAllByUserIds,
  organizationsUsersGetAllMembers,
  organizationsUsersGetAllParticipants,
  organizationsUsersGetByUserAndOrganizationId,
  organizationsUsersGetParticipantByEmailOrPhone,
  organizationsUsersGetParticipantsByEmailOrPhone,
  organizationsUsersUpdate,
  organizationsUsersUpsertMany,
} from "@/server/services/organizations-users"

const organizationsUsersInsertSchema = createInsertSchema(organizationsUsers)
const organizationsUsersUpdateSchema = createUpdateSchema(organizationsUsers)

export const organizationsUsersRouter = createTRPCRouter({
  create: publicProcedure.input(organizationsUsersInsertSchema).mutation(async ({ ctx, input }) => {
    return organizationsUsersCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(organizationsUsersUpdateSchema).mutation(async ({ ctx, input }) => {
    return organizationsUsersUpdate({ database: ctx.db, input })
  }),

  upsertMany: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        users: z.array(
          z.object({
            userId: z.string(),
            eligible: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return organizationsUsersUpsertMany({ database: ctx.db, input })
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return organizationsUsersDelete({ database: ctx.db, input })
  }),

  deleteWithReassign: publicProcedure
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
        userId: z.string(),
        newAdminUserId: z.string().nullish(),
        campaignSponsorReassignments: z
          .array(z.object({ campaignId: z.string(), newSponsorId: z.string() }))
          .optional(),
        updatedByUserId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { updatedByUserId, ...rest } = input
      return organizationsUsersDeleteWithReassign({ database: ctx.db, input: rest, updatedByUserId })
    }),

  getAllMembers: publicProcedure
    .input(
      z.object({ organizationId: z.string(), roles: z.array(z.enum(RolesEnum)), activeOnly: z.boolean().optional() })
    )
    .query(async ({ ctx, input }) => {
      return organizationsUsersGetAllMembers({ database: ctx.db, input })
    }),

  getAllParticipants: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    return organizationsUsersGetAllParticipants({ database: ctx.db, input })
  }),

  getAdmin: publicProcedure.input(z.object({ organizationId: z.string() })).query(async ({ ctx, input }) => {
    return organizationsUsersGetAdmin({ database: ctx.db, input })
  }),

  getAllByUserIds: publicProcedure.input(z.object({ userIds: z.array(z.string()) })).query(async ({ ctx, input }) => {
    return organizationsUsersGetAllByUserIds({ database: ctx.db, input })
  }),

  getByUserAndOrganizationId: publicProcedure
    .input(z.object({ userId: z.string(), organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return organizationsUsersGetByUserAndOrganizationId({ database: ctx.db, input })
    }),

  getParticipantByEmailOrPhone: publicProcedure
    .input(z.object({ organizationId: z.string(), email: z.string().optional(), phone: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return organizationsUsersGetParticipantByEmailOrPhone({
        database: ctx.db,
        input,
      })
    }),

  getParticipantsByEmailOrPhone: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        emails: z.array(z.string()).optional(),
        phones: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return organizationsUsersGetParticipantsByEmailOrPhone({ database: ctx.db, input })
    }),
})
