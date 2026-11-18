import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import {
  participantNamesAccessGetStatus,
  participantNamesAccessGrant,
  participantNamesAccessRevoke,
} from "@/server/services/participant-names-access"
import { participantNamesAccessLogCreate } from "@/server/services/participant-names-access-logs.ts/participant-names-access-logs-create"

const campaignIdInput = z.object({ campaignId: z.string().uuid() })
const logAccessEventInput = z.object({
  campaignId: z.string().uuid(),
  eventType: z.enum(["VIEW_PARTICIPANT_NAMES", "DOWNLOAD_REPORT"]),
  reportName: z.string().nullable().optional(),
  fileType: z.enum(["CSV", "EXCEL"]).nullable().optional(),
})
const requireOrgAdmin = (userRole: string | null | undefined) => {
  if (userRole !== RolesEnum.ORGANIZATION_ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only Organization Admins can manage participant name access" })
  }
}

export const participantNamesAccessRouter = createTRPCRouter({
  getStatus: publicProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    requireOrgAdmin(ctx.userRole)
    return participantNamesAccessGetStatus({ database: ctx.db, campaignId: input.campaignId })
  }),

  hasAccess: publicProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })
    let isGranted = false
    if (ctx.userRole === RolesEnum.SALES_REPRESENTATIVE && ctx.userId) {
      ;({ isGranted } = await participantNamesAccessGetStatus({
        database: ctx.db,
        campaignId: input.campaignId,
        fundraiserUserId: ctx.userId,
      }))
    }
    return { isGranted }
  }),

  grant: publicProcedure.input(campaignIdInput).mutation(async ({ ctx, input }) => {
    requireOrgAdmin(ctx.userRole)

    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })

    const user = await ctx.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.userId!),
      columns: { id: true },
    })

    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

    return participantNamesAccessGrant({
      database: ctx.db,
      campaignId: input.campaignId,
      grantedByUserId: user.id,
    })
  }),

  revoke: publicProcedure.input(campaignIdInput).mutation(async ({ ctx, input }) => {
    requireOrgAdmin(ctx.userRole)

    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" })

    const user = await ctx.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.userId!),
      columns: { id: true },
    })

    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

    return participantNamesAccessRevoke({
      database: ctx.db,
      campaignId: input.campaignId,
      revokedByUserId: user.id,
      reason: FcAccessRevocationReasonEnum.ORG_ADMIN_REVOKED,
    })
  }),

  logAccessEvent: publicProcedure.input(logAccessEventInput).mutation(async ({ ctx, input }) => {
    if (!ctx.userId || !ctx.userRole) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    const { isGranted } = await participantNamesAccessGetStatus({
      database: ctx.db,
      campaignId: input.campaignId,
      fundraiserUserId: ctx.userId,
    })

    if (!isGranted) {
      return null
    }

    return participantNamesAccessLogCreate({
      database: ctx.db,
      input: {
        userId: ctx.userId,
        userRole: ctx.userRole,
        campaignId: input.campaignId,
        eventType: input.eventType,
        reportName: input.reportName ?? null,
        fileType: input.fileType ?? null,
      },
    })
  }),
})
