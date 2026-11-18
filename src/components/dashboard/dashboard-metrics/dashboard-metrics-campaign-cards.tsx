"use client"

import {
  CampaignMetricsCasesCard,
  CampaignMetricsDigitalPaymentsShareCard,
  CampaignMetricsFeaturesCard,
  CampaignMetricsLastActivityCard,
  CampaignMetricsParticipantsStatusCard,
  CampaignMetricsPaymentsCard,
  CampaignMetricsPermissionSlipsCard,
} from "@/components/campaigns/campaign-metrics-cards"
import { Skeleton } from "@/components/ui/skeleton"
import { getPrizeTemplateName } from "@/constants/prize-templates"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

export function DashboardMetricsCampaignCards({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = api.campaigns.getMetrics.useQuery({ campaignId })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`header-metric-skeleton-${index}`} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4")}>
      <CampaignMetricsCasesCard
        totalCasesCheckedOut={data?.totalCasesCheckedOut ?? 0}
        totalCasesDelivered={data?.totalCasesDelivered ?? 0}
      />

      <CampaignMetricsPaymentsCard
        totalPaymentCollectedCents={data?.totalPaidCents ?? 0}
        totalPaymentExpectedCents={data?.totalExpectedCents ?? 0}
      />

      {data?.digitalPayment && (
        <CampaignMetricsDigitalPaymentsShareCard
          digitalPaymentsAmountCents={data?.digitalPaymentsAmountCents ?? 0}
          digitalPaymentsPercentage={data?.digitalPaymentsPercentage ?? 0}
          totalPaymentsAmountCents={data?.totalPaymentsAmountCents ?? 0}
        />
      )}

      <CampaignMetricsParticipantsStatusCard activeUsers={data?.activeUsers ?? 0} totalUsers={data?.totalUsers ?? 0} />

      <CampaignMetricsPermissionSlipsCard
        signedPermissionSlips={data?.signedPermissionSlips ?? 0}
        totalPermissionSlips={data?.totalPermissionSlips ?? 0}
      />

      <CampaignMetricsFeaturesCard
        digitalPayment={data?.digitalPayment ?? false}
        digitalPermissionSlip={data?.digitalPermissionSlip ?? false}
        homeRunPrizesTemplate={data?.homeRunPrizesTemplate ?? false}
        prizeTemplateName={getPrizeTemplateName(data?.prizeTemplateSlug)}
      />

      <CampaignMetricsLastActivityCard lastActivityAt={data?.lastActivityAt ?? null} />
    </div>
  )
}
