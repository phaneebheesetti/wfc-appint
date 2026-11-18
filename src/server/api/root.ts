import { campaignsRouter } from "@/server/api/routers/campaigns"
import { campaignsProgressRouter } from "@/server/api/routers/campaigns-progress"
import { campaignsUsersRouter } from "@/server/api/routers/campaigns-users"
import { casesTransactionsRouter } from "@/server/api/routers/cases-transactions"
import { channelMessagesRouter } from "@/server/api/routers/channel-messages"
import { channelsRouter } from "@/server/api/routers/channels"
import { consumerPaymentLogsRouter } from "@/server/api/routers/consumer-payment-logs"
import { digitalSalesInformationRouter } from "@/server/api/routers/digital-sales-information"
import { documentsRouter } from "@/server/api/routers/documents"
import { documentsUsersRouter } from "@/server/api/routers/documents-users"
import { eventsRouter } from "@/server/api/routers/events"
import { organizationsRouter } from "@/server/api/routers/organizations"
import { organizationsUsersRouter } from "@/server/api/routers/organizations-users"
import { participantParentMappingRouter } from "@/server/api/routers/participant-parent-mapping"
import { paymentLogsRouter } from "@/server/api/routers/payment-logs"
import { prizesRouter } from "@/server/api/routers/prizes"
import { usersRouter } from "@/server/api/routers/users"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

import { campaignAnnouncementsRouter } from "./routers/campaign-announcements"
import { participantNamesAccessRouter } from "./routers/participant-names-access"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  campaignAnnouncements: campaignAnnouncementsRouter,
  campaignsProgress: campaignsProgressRouter,
  campaignsUsers: campaignsUsersRouter,
  campaigns: campaignsRouter,
  casesTransactions: casesTransactionsRouter,
  digitalSalesInformation: digitalSalesInformationRouter,
  channelMessages: channelMessagesRouter,
  channels: channelsRouter,
  consumerPaymentLogs: consumerPaymentLogsRouter,
  documentsUsers: documentsUsersRouter,
  documents: documentsRouter,
  events: eventsRouter,
  organizationsUsers: organizationsUsersRouter,
  organizations: organizationsRouter,
  participantParentMapping: participantParentMappingRouter,
  paymentLogs: paymentLogsRouter,
  participantNamesAccess: participantNamesAccessRouter,
  prizes: prizesRouter,
  users: usersRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
