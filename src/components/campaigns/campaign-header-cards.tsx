"use client"

import posthog from "posthog-js"
import { useEffect } from "react"

import {
  CampaignMetricsCasesCard,
  CampaignMetricsDigitalPaymentsShareCard,
  CampaignMetricsParticipantsEngagamentCard,
  CampaignMetricsPaymentsCard,
} from "@/components/campaigns/campaign-metrics-cards"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/env"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

interface CampaignsHeaderCardsProps {
  campaignId: string
}

export function CampaignsHeaderCards({ campaignId }: CampaignsHeaderCardsProps) {
  const { data: metrics, isLoading: isLoadingMetrics } = api.campaigns.getHeaderMetrics.useQuery({ campaignId })
  const { data: totalsByWeekday, isLoading: isLoadingTotalsByWeekday } =
    api.paymentLogs.getTotalByPaymentMethodAndWeekday.useQuery({
      campaignId,
    })

  const isLoading = isLoadingMetrics || isLoadingTotalsByWeekday

  const digitalPayments = totalsByWeekday?.paymentSummary?.digital
  const cashPayments = totalsByWeekday?.paymentSummary?.cash
  const isDigitalEnabled = digitalPayments?.enabled ?? false
  const totalPaymentsCents = ((digitalPayments?.amount ?? 0) + (cashPayments?.amount ?? 0)) * 100

  // Inventory adjustments lower the delivered / expected values
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const casesAdjusted = isInventoryUpdatesEnabled ? (metrics?.totalCasesAdjusted ?? 0) : 0
  const paymentAdjusted = isInventoryUpdatesEnabled ? (metrics?.totalPaymentAdjusted ?? 0) : 0
  const effectiveCasesDelivered = Math.max((metrics?.totalCasesDelivered ?? 0) - casesAdjusted, 0)
  const effectivePaymentExpected = Math.max((metrics?.totalPaymentExpected ?? 0) - paymentAdjusted, 0)

  useEffect(() => {
    if (!metrics || !totalsByWeekday) return

    const totalCasesDelivered = effectiveCasesDelivered
    const totalCasesCheckedOut = metrics.totalCasesCheckedOut ?? 0
    const casesPercentage =
      totalCasesDelivered > 0 ? ((totalCasesCheckedOut / totalCasesDelivered) * 100).toFixed(2) : "0.00"

    const paymentExpected = effectivePaymentExpected
    const paymentCollected = metrics.totalPaymentCollected ?? 0
    const paymentPercentage = paymentExpected > 0 ? ((paymentCollected / paymentExpected) * 100).toFixed(2) : "0.00"

    posthog.capture("campaign_metrics", {
      campaign_id: campaignId,
      cases_checkedout_to_delivery_ratio: `${totalCasesCheckedOut} of ${totalCasesDelivered} (${casesPercentage}%)`,
      fund_collection_ratio: `$${paymentCollected.toFixed(2)} of $${paymentExpected.toFixed(2)} (${paymentPercentage}%)`,
    })
  }, [
    metrics,
    totalsByWeekday,
    campaignId,
    digitalPayments,
    totalPaymentsCents,
    effectiveCasesDelivered,
    effectivePaymentExpected,
  ])

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`header-metric-skeleton-${index}`} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", isDigitalEnabled && "md:grid-cols-4")}>
      <CampaignMetricsCasesCard
        totalCasesCheckedOut={metrics?.totalCasesCheckedOut ?? 0}
        totalCasesDelivered={effectiveCasesDelivered}
      />

      <CampaignMetricsPaymentsCard
        totalPaymentCollectedCents={(metrics?.totalPaymentCollected ?? 0) * 100}
        totalPaymentExpectedCents={effectivePaymentExpected * 100}
      />

      {isDigitalEnabled && (
        <CampaignMetricsDigitalPaymentsShareCard
          digitalPaymentsAmountCents={(digitalPayments?.amount ?? 0) * 100}
          digitalPaymentsPercentage={digitalPayments?.percentage ?? 0}
          totalPaymentsAmountCents={totalPaymentsCents}
        />
      )}

      <CampaignMetricsParticipantsEngagamentCard
        engagedUsers={metrics?.totalParticipantsEngagement ?? 0}
        totalUsers={metrics?.totalParticipants ?? 0}
      />
    </div>
  )
}
