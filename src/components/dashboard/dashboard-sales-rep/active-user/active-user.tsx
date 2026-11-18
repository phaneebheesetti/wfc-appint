"use client"

import { ActiveUserOverview } from "@/components/dashboard/dashboard-sales-rep/active-user/active-user-overview"
import { ActiveUserQuickActions } from "@/components/dashboard/dashboard-sales-rep/active-user/active-user-quick-actions"

export function SalesRepActiveUser() {
  return (
    <div>
      <ActiveUserOverview />

      <ActiveUserQuickActions />
    </div>
  )
}
