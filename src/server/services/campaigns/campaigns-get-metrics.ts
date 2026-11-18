import { and, eq, isNull } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { DocumentsTypeEnum } from "@/constants/documents"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { PaymentLogsStatusEnum, PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import type { db } from "@/server/db"
import {
  campaigns,
  campaignsUsers,
  casesTransactions,
  documents,
  documentsUsers,
  paymentLogs,
} from "@/server/db/schema"
import { getTotalCasesAdjusted, getTotalCasesCheckedOut, getTotalCasesDelivered } from "@/utils/cases-transactions"

export interface CampaignsGetMetricsData {
  campaignId: string
  totalCasesCheckedOut: number
  totalCasesDelivered: number
  totalPaidCents: number
  totalOwedCents: number
  totalExpectedCents: number
  activeUsers: number
  totalUsers: number
  signedPermissionSlips: number
  totalPermissionSlips: number
  digitalPayment: boolean
  digitalPermissionSlip: boolean
  homeRunPrizesTemplate: boolean
  /** Slug of the applied Home Run template, or null for "Create my own". */
  prizeTemplateSlug: string | null
  digitalPaymentsAmountCents: number
  digitalPaymentsPercentage: number
  totalPaymentsAmountCents: number
  lastActivityAt: Date | null
}

export const campaignsGetMetrics = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<CampaignsGetMetricsData> => {
  const permissionSlipDocument = await database.query.documents.findFirst({
    where: and(eq(documents.type, DocumentsTypeEnum.PERMISSION_SLIP), eq(documents.campaignId, input.campaignId)),
  })

  const [campaignData, campaignsUsersData, casesTransactionsData, paymentLogsData, documentsUsersData = []] =
    await Promise.all([
      database.query.campaigns.findFirst({
        where: eq(campaigns.id, input.campaignId),
      }),
      database.query.campaignsUsers.findMany({
        where: eq(campaignsUsers.campaignId, input.campaignId),
        with: {
          user: {
            with: {
              parentUser: {
                columns: {
                  clerkId: true,
                },
              },
            },
          },
        },
      }),
      database.query.casesTransactions.findMany({
        where: eq(casesTransactions.campaignId, input.campaignId),
      }),
      database.query.paymentLogs.findMany({
        where: and(
          eq(paymentLogs.campaignId, input.campaignId),
          eq(paymentLogs.status, PaymentLogsStatusEnum.COMPLETED),
          isNull(paymentLogs.deletedAt)
        ),
      }),
      permissionSlipDocument?.id
        ? database.query.documentsUsers.findMany({
            where: eq(documentsUsers.documentId, permissionSlipDocument.id),
          })
        : Promise.resolve([]),
    ])

  const totalCasesCheckedOut = getTotalCasesCheckedOut(casesTransactionsData)
  // Inventory adjustments reduce the delivered cases and the revenue expected from them (only when the flag is on)
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const totalCasesAdjusted = isInventoryUpdatesEnabled ? getTotalCasesAdjusted(casesTransactionsData) : 0
  const totalCasesDelivered = Math.max(getTotalCasesDelivered(casesTransactionsData) - totalCasesAdjusted, 0)

  const totalPaidCents = paymentLogsData.reduce((acc, log) => acc + (log.amountCents ?? 0), 0)

  const totalOwedCents = casesTransactionsData
    .filter(transaction => transaction.type === (CasesTransactionsTypeEnum.CHECKOUT as string))
    .reduce((acc, transaction) => acc + (transaction.totalPriceCents ?? 0), 0)

  const totalDeliveredCents = casesTransactionsData
    .filter(transaction => transaction.type === (CasesTransactionsTypeEnum.DELIVERED as string))
    .reduce((acc, transaction) => acc + (transaction.totalPriceCents ?? 0), 0)

  const totalAdjustedCents = isInventoryUpdatesEnabled
    ? casesTransactionsData
        .filter(transaction => transaction.type === (CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT as string))
        .reduce((acc, transaction) => acc + (transaction.totalPriceCents ?? 0), 0)
    : 0

  const totalExpectedCents = Math.max(totalDeliveredCents - totalAdjustedCents, 0)

  const activeUsers = campaignsUsersData.filter(
    campaignUser => campaignUser.user.deletedAt === null && campaignUser.user.status === UsersStatusEnum.ACTIVE
  ).length
  const totalUsers = campaignsUsersData.length

  const signedPermissionSlips = documentsUsersData.filter(
    documentUser => documentUser.status === DocumentsUsersStatusEnum.SIGNED
  ).length
  const totalPermissionSlips = documentsUsersData.length

  const digitalPayments = paymentLogsData.filter(log => log.type === PaymentLogsTypeEnum.DIGITAL)
  const digitalPaymentsAmountCents = digitalPayments.reduce((acc, log) => acc + (log.amountCents ?? 0), 0)
  const digitalPaymentsPercentage = totalPaidCents > 0 ? (digitalPaymentsAmountCents / totalPaidCents) * 100 : 0

  const totalPaymentsAmountCents = totalPaidCents

  const clerkUserIdsSet = new Set<string>()
  for (const campaignUser of campaignsUsersData) {
    if (campaignUser.user?.clerkId) {
      clerkUserIdsSet.add(campaignUser.user.clerkId)
    }
    if (campaignUser.user?.parentUser?.clerkId) {
      clerkUserIdsSet.add(campaignUser.user.parentUser.clerkId)
    }
  }
  const clerkUserIds = Array.from(clerkUserIdsSet)

  let lastActivityAt: Date | null = null
  if (clerkUserIds.length > 0) {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/clerk/users/latest-activity`, {
      method: "POST",
      body: JSON.stringify({ ids: clerkUserIds }),
    })

    if (response.ok) {
      const json = (await response.json()) as { data: { lastActiveAt: string | null } }
      lastActivityAt = json.data.lastActiveAt ? new Date(json.data.lastActiveAt) : null
    }
  }

  return {
    campaignId: input.campaignId,
    totalCasesDelivered,
    totalCasesCheckedOut,
    totalPaidCents,
    totalOwedCents,
    totalExpectedCents,
    activeUsers,
    totalUsers,
    signedPermissionSlips,
    totalPermissionSlips,
    digitalPayment: campaignData?.digitalPayment ?? false,
    digitalPermissionSlip: campaignData?.digitalPermissionSlip ?? false,
    homeRunPrizesTemplate: campaignData?.homeRunPrizesTemplate ?? false,
    prizeTemplateSlug: campaignData?.prizeTemplateSlug ?? null,
    digitalPaymentsAmountCents,
    digitalPaymentsPercentage,
    totalPaymentsAmountCents,
    lastActivityAt,
  }
}
