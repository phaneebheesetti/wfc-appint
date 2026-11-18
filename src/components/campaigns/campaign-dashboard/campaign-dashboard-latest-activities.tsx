import { ArrowBigDownDash } from "lucide-react"
import { Fragment, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"

interface CampaignDashboardLatestActivitiesProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboardLatestActivities({ user, campaign }: CampaignDashboardLatestActivitiesProps) {
  const [viewMoreSliceIndex, setViewMoreSliceIndex] = useState(5)

  const { data: casesTransactions = [], isLoading: isLoadingCasesTransactions } =
    api.casesTransactions.getAllFromUserAtCampaign.useQuery(
      { userId: user.id, campaignId: campaign.id },
      { enabled: !!user.id && !!campaign.id }
    )

  const { data: paymentLogs = [], isLoading: isLoadingPaymentLogs } =
    api.paymentLogs.listByCampaignIdAndUserId.useQuery(
      { userId: user.id, campaignId: campaign.id },
      { enabled: !!user.id && !!campaign.id }
    )

  const casesTransactionsActivities = casesTransactions.map(transaction => ({
    id: transaction.id,
    name: `${transaction.quantity} Case${transaction.quantity > 1 ? "s" : ""} Checked Out`,
    date: transaction.createdAt,
  }))

  const paymentLogsActivities = paymentLogs.map(log => ({
    id: log.id,
    name: `${formatCentsToCurrency(log.amountCents)} Payment Received`,
    date: log.createdAt,
  }))

  const isLoading = isLoadingCasesTransactions || isLoadingPaymentLogs
  if (isLoading) return <Skeleton className="h-64 w-full" />

  const activities = [...casesTransactionsActivities, ...paymentLogsActivities]
  if (activities.length === 0) return null

  const sortedActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, viewMoreSliceIndex)

  return (
    <div className="flex flex-col gap-4 rounded-card bg-accent p-4">
      <div className="text-xl font-semibold">Latest Activities</div>

      {sortedActivities.map(activity => (
        <Fragment key={activity.id}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="font-medium">{activity.name}</div>
            <div className="text-muted-foreground">{formatDate(activity.date)}</div>
          </div>
          <hr />
        </Fragment>
      ))}

      {activities.length > viewMoreSliceIndex && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="w-fit"
            size="sm"
            onClick={() => setViewMoreSliceIndex(viewMoreSliceIndex + 5)}
          >
            <ArrowBigDownDash />
            View More
          </Button>
        </div>
      )}
    </div>
  )
}
