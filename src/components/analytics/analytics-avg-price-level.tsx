import { Trophy } from "lucide-react"

import { MetricCardSmall } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ColorEnum } from "@/constants/colors"
import { api } from "@/trpc/react"
import { getCurrentPrizeLevel } from "@/utils/prizes"

interface AnalyticsAvgPriceLevelProps {
  campaignId: string
}

export function AnalyticsAvgPriceLevel({ campaignId }: AnalyticsAvgPriceLevelProps) {
  const { data: prizes = [], isLoading: isLoadingPrizes } = api.prizes.listByCampaignId.useQuery({ campaignId })
  const { data: calculatedData, isLoading: isLoadingCalculatedData } = api.campaigns.getAnalyticsAvgPriceLevel.useQuery(
    { campaignId }
  )

  const isLoading = isLoadingPrizes || isLoadingCalculatedData

  if (isLoading) {
    return <Skeleton className="w-full h-[170px]" />
  }

  const prizeLevel = getCurrentPrizeLevel({
    casesPaid: calculatedData?.avgCasesPaidPerUser ?? 0,
    casesCheckedOut: calculatedData?.totalCasesPaid ?? 0,
    prizes,
  })

  return (
    <MetricCardSmall
      title="Average Prize"
      icon={Trophy}
      value={prizeLevel?.name ?? "-"}
      description={`total participants’ level average`}
      color={ColorEnum.MUTED}
    />
  )
}
