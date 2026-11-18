import { differenceInCalendarDays, format } from "date-fns"
import { Calendar } from "lucide-react"

import { MetricCardSmall } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ColorEnum } from "@/constants/colors"
import { api } from "@/trpc/react"

interface AnalyticsDaysRemainingProps {
  campaignId: string
}

export function AnalyticsDaysRemaining({ campaignId }: AnalyticsDaysRemainingProps) {
  const { data: campaign, isLoading } = api.campaigns.getById.useQuery({ id: campaignId })

  if (isLoading) {
    return <Skeleton className="w-full h-[170px]" />
  }

  const daysRemaining = campaign?.endDate
    ? Math.max(0, differenceInCalendarDays(new Date(campaign.endDate), new Date()))
    : 0
  const description =
    campaign?.startDate && campaign?.endDate
      ? `${format(new Date(campaign.startDate), "MM/dd/yy")} to ${format(new Date(campaign.endDate), "MM/dd/yy")}`
      : "Date range not available"

  return (
    <MetricCardSmall
      title="Days Remaining"
      icon={Calendar}
      value={`${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
      description={description}
      color={ColorEnum.MUTED}
    />
  )
}
