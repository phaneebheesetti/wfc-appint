"use client"

import { SalesRepActiveUser } from "@/components/dashboard/dashboard-sales-rep/active-user"
import { SalesRepNewUser } from "@/components/dashboard/dashboard-sales-rep/new-user"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

export function DashboardSalesRep() {
  const { loggedInUserId } = useLoggedInUser()

  const { data: onboardingState, isLoading } = api.organizations.fcOnboardingState.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  if (isLoading || !onboardingState) return null

  // An FC is a "new user" when they have no (non-draft) organization yet.
  const isNewUser = onboardingState.isNewUser

  if (isNewUser) {
    return <SalesRepNewUser />
  }

  return <SalesRepActiveUser />
}
