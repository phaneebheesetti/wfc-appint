"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"
import { formatCurrency } from "@/utils/money"

interface AnalyticsTotalCampaignProfitProps {
  campaignId: string
}

export function AnalyticsTotalCampaignProfit({ campaignId }: AnalyticsTotalCampaignProfitProps) {
  const { data: totalCampaignProfit, isLoading } = api.campaigns.getAnalyticsTotalCampaignProfit.useQuery({
    campaignId,
  })

  if (isLoading) {
    return <Skeleton className="w-full h-[180px]" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 p-4 pb-2">
        <CardTitle className="flex flex-row items-center gap-1 justify-between w-full">
          <span className="font-medium text-xl leading-5 flex-1">Funds Raised</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 p-4 pt-0">
        <p className="text-sm text-muted-foreground">Organization split of total payment collected</p>
        <p className="text-4xl font-semibold">{formatCurrency(totalCampaignProfit?.totalCampaignProfit ?? 0, 2)}</p>
      </CardContent>
    </Card>
  )
}
