import { Fragment, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"
import { getUserDisplayName } from "@/utils/users"

export function ParentDashboardLatestActivities() {
  const [viewMoreSliceIndex, setViewMoreSliceIndex] = useState(5)
  const { loggedInUserId } = useLoggedInUser()

  const { data: casesTransactions = [], isLoading: isLoadingCasesTransactions } =
    api.casesTransactions.getAllFromParentId.useQuery({ parentId: loggedInUserId! }, { enabled: !!loggedInUserId })

  const { data: paymentLogs = [], isLoading: isLoadingPaymentLogs } = api.paymentLogs.listByParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId }
  )

  const casesTransactionsActivities = casesTransactions.map(transaction => ({
    id: transaction.id,
    name: `${getUserDisplayName(transaction.user, "Family Member")}: ${transaction.quantity} Case${transaction.quantity > 1 ? "s" : ""} Checked Out`,
    campaign: transaction.campaign?.name ?? "Unknown Fundraiser",
    date: transaction.createdAt,
  }))

  const paymentLogsActivities = paymentLogs.map(log => ({
    id: log.id,
    name: `${getUserDisplayName(log.user, "Family Member")}: ${formatCentsToCurrency(log.amountCents)} Payment Received`,
    campaign: "Payment", // Payment logs might not have campaign info in this context
    date: log.createdAt,
  }))

  const activities = [...casesTransactionsActivities, ...paymentLogsActivities]

  const sortedActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, viewMoreSliceIndex)

  const isLoading = isLoadingCasesTransactions || isLoadingPaymentLogs

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-accent p-4">
        <div className="text-xl font-semibold">Latest Activities</div>
        <div className="text-center text-muted-foreground py-8">
          <p>No activities yet</p>
          <p className="text-sm">Family member activities will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-accent p-4">
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
            View More
          </Button>
        </div>
      )}
    </div>
  )
}
