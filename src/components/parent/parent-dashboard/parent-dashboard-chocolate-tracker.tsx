import { useMemo } from "react"

import { ChocolateTracker } from "@/components/chocolate-tracker"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

export function ParentDashboardChocolateTracker() {
  const { loggedInUserId } = useLoggedInUser()

  const { data: casesTransactions = [], isLoading } = api.casesTransactions.getAllFromParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId }
  )

  const totalCases = useMemo(
    () => casesTransactions?.reduce((acc, transaction) => acc + transaction.quantity, 0) ?? 0,
    [casesTransactions]
  )

  return (
    <ChocolateTracker
      title="Family Cases Tracker"
      value={totalCases}
      valueDescription="cases checked"
      description="total cases checked out by your family"
      isLoading={isLoading}
    />
  )
}
