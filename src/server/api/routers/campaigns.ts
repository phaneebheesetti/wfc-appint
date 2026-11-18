import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { z } from "zod"

import type { CampaignTransactionEnum } from "@/constants/campaigns"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { PAGINATION_AND_ORDER_BY_SCHEMA } from "@/constants/database"
import { RolesEnum } from "@/constants/roles"
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc"
import { type User, campaigns } from "@/server/db/schema"
import {
  campaignsClosedCountForSalesRep,
  campaignsCreate,
  campaignsDelete,
  campaignsDownloadReportById,
  campaignsGetAboutToEndForParent,
  campaignsGetActiveCampaignsByUserId,
  campaignsGetAllFromUserId,
  campaignsGetAllPaginated,
  campaignsGetAnalyticsAvgPriceLevel,
  campaignsGetAnalyticsTotalCampaignProfit,
  campaignsGetByCreatedByUserId,
  campaignsGetById,
  campaignsGetByOrganizationId,
  campaignsGetCampaignForOrgAdmin,
  campaignsGetCampaignsByUserId,
  campaignsGetCampaignsByUserIdWithSponsor,
  campaignsGetCampaignsForParent,
  campaignsGetCampaignsForSalesRep,
  campaignsGetEventsOverview,
  campaignsGetHeaderMetrics,
  campaignsGetLeaderboards,
  campaignsGetMetrics,
  campaignsGetOrgAdminWelcomeCampaign,
  campaignsGetParticipantsByEvent,
  campaignsGetPrizesOverview,
  campaignsGetSmallCardsMetrics,
  campaignsGetSummary,
  campaignsGetTransactionsByUserId,
  campaignsLaunchFromOnboarding,
  campaignsMarkAllWelcomeSeen,
  campaignsUpdate,
} from "@/server/services/campaigns"
import { campaignsCreationState } from "@/server/services/campaigns/campaign-creation-state"
import { campaignsLaunchFromOrganizations } from "@/server/services/campaigns/campaigns-launch-from-organizations"

export type CampaignTransaction = {
  createdAt: Date
  type: CampaignTransactionEnum
  amount: number
  transactionType: string
  user: User
}

export type CampaignPrizeEventEligibleUser = {
  userId: string
  fullName: string | null
  email: string | null
  grade: string | null
  teacher: string
  casesCheckedOut: number
  casesPaid: number
  amountPaid: number
}

export interface CampaignEventsStats {
  participantsByCategory: Record<string, number>
  totalParticipants: number
  usersBalance: Record<
    string,
    { casesCheckedOut: number; casesPaid: number; amountPaidCents: number; totalAmountDueCents: number }
  >
  eventTiers: Record<
    string,
    {
      id: string
      name: string
      eligibleParticipants: number
      casesCheckout: number
      casesPaid: number
      firstPayment: boolean
      firstCaseCheckout: boolean
      allParticipants: boolean
      prizeQualification: boolean
      prizeId: string | null
      participantIds: string[]
    }
  >
}

const campaignsInsertSchema = createInsertSchema(campaigns).omit({
  homeRunPrizesTemplate: true,
  prizeTemplateSlug: true,
})
const campaignsUpdateSchema = createUpdateSchema(campaigns).omit({
  homeRunPrizesTemplate: true,
  prizeTemplateSlug: true,
})

export const campaignsRouter = createTRPCRouter({
  create: publicProcedure.input(campaignsInsertSchema).mutation(async ({ ctx, input }) => {
    return campaignsCreate({ database: ctx.db, input })
  }),

  update: publicProcedure.input(campaignsUpdateSchema).mutation(async ({ ctx, input }) => {
    return campaignsUpdate({ database: ctx.db, input, updatedByUserId: ctx.userId ?? undefined })
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return campaignsDelete({ database: ctx.db, input, deletedByUserId: ctx.userId ?? undefined })
  }),

  launchFromOnboarding: publicProcedure.input(z.object({ userId: z.string() })).mutation(async ({ ctx, input }) => {
    return campaignsLaunchFromOnboarding({ database: ctx.db, input })
  }),

  launchFromOrganizations: publicProcedure
    .input(z.object({ userId: z.string(), campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsLaunchFromOrganizations({ database: ctx.db, input })
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetById({ database: ctx.db, input })
  }),

  getByCreatedByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetByCreatedByUserId({ database: ctx.db, input })
  }),

  getByOrganizationId: publicProcedure
    .input(z.object({ organizationId: z.string(), userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetByOrganizationId({ database: ctx.db, input })
    }),

  getCampaignsCreationState: publicProcedure
    .input(z.object({ userId: z.string(), campaignId: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      return campaignsCreationState({ database: ctx.db, input })
    }),

  getAnalyticsAvgPriceLevel: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetAnalyticsAvgPriceLevel({ database: ctx.db, input })
    }),

  getSmallCardsMetrics: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetSmallCardsMetrics({ database: ctx.db, input })
  }),

  getHeaderMetrics: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetHeaderMetrics({ database: ctx.db, input })
  }),

  getMetrics: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetMetrics({ database: ctx.db, input })
  }),

  getAnalyticsTotalCampaignProfit: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetAnalyticsTotalCampaignProfit({ database: ctx.db, input })
    }),

  getAllPaginated: publicProcedure
    .input(
      PAGINATION_AND_ORDER_BY_SCHEMA.extend({
        search: z.string().optional(),
        sponsorId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsGetAllPaginated({ database: ctx.db, input })
    }),

  getCampaignsByUserId: publicProcedure
    .input(z.object({ userId: z.string(), role: z.enum(RolesEnum).optional() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetCampaignsByUserId({ database: ctx.db, input })
    }),

  getCampaignsForSalesRep: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetCampaignsForSalesRep({ database: ctx.db, input })
  }),

  getCampaignForOrgAdmin: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetCampaignForOrgAdmin({ database: ctx.db, input })
  }),

  getActiveCampaignsByUserId: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetActiveCampaignsByUserId({ database: ctx.db, input })
  }),

  getCampaignsByUserIdWithSponsor: publicProcedure
    .input(z.object({ userId: z.string(), organizationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetCampaignsByUserIdWithSponsor({ database: ctx.db, input })
    }),

  getOrgAdminWelcomeCampaign: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetOrgAdminWelcomeCampaign({ database: ctx.db, input })
  }),

  markAllOrgAdminWelcomeSeen: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsMarkAllWelcomeSeen({ database: ctx.db, input })
    }),

  getTransactionsByUserId: publicProcedure
    .input(z.object({ campaignId: z.string(), userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetTransactionsByUserId({ database: ctx.db, input })
    }),

  getLeaderboards: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetLeaderboards({ database: ctx.db, input })
  }),

  getPrizesOverview: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetPrizesOverview({ database: ctx.db, input })
  }),

  getEventsOverview: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetEventsOverview({ database: ctx.db, input })
  }),

  getParticipantsByEvent: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetParticipantsByEvent({ database: ctx.db, input })
  }),

  getSummary: publicProcedure.input(z.object({ campaignId: z.string() })).query(async ({ ctx, input }) => {
    return campaignsGetSummary({ database: ctx.db, input })
  }),

  getCampaignsAboutToEndForParent: publicProcedure
    .input(
      z.object({
        parentId: z.string(),
        status: z.enum(CampaignsStatusEnum).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsGetAboutToEndForParent({ database: ctx.db, input })
    }),

  getCampaignsForParent: publicProcedure
    .input(
      z.object({
        parentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsGetCampaignsForParent({ database: ctx.db, input })
    }),

  downloadReportByCampaignId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return campaignsDownloadReportById({ database: ctx.db, input })
    }),

  getAllFromUserId: publicProcedure
    .input(z.object({ userId: z.string(), role: z.enum(RolesEnum).optional() }))
    .query(async ({ ctx, input }) => {
      return campaignsGetAllFromUserId({ database: ctx.db, input })
    }),

  getClosedCampaignsCount: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return campaignsClosedCountForSalesRep({
        database: ctx.db,
        userId: input.userId,
      })
    }),
})
