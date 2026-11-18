import { useMemo } from "react"

import { ChocolateTracker } from "@/components/chocolate-tracker"
import { api } from "@/trpc/react"

interface ParticipantDashboardChocolateTrackerProps {
  userId: string
}

export function ParticipantDashboardChocolateTracker({ userId }: ParticipantDashboardChocolateTrackerProps) {
  const { data: casesTransactions, isLoading } = api.casesTransactions.getAllFromUserOnActiveCampaigns.useQuery({
    userId,
  })

  const totalBars = useMemo(
    () =>
      casesTransactions?.reduce((acc, transaction) => acc + transaction.quantity * (transaction.barsPerCase ?? 0), 0) ??
      0,
    [casesTransactions]
  )

  const totalCases = useMemo(
    () => casesTransactions?.reduce((acc, transaction) => acc + transaction.quantity, 0) ?? 0,
    [casesTransactions]
  )

  return (
    <ChocolateTracker
      title="Chocolate Tracker"
      value={totalCases}
      valueDescription="total cases checked"
      description="Total cases checked out across all your campaigns"
      bars={totalBars}
      isLoading={isLoading}
    />
  )
}
