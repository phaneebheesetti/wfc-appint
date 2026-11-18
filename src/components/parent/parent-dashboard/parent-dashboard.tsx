import { useState } from "react"

import { ParticipantDashboard } from "@/components/participant/participant-dashboard/participant-dashboard"
import { type User } from "@/server/db/schema"
import { getUserDisplayName } from "@/utils/users"

import { ParentDashboardCampaigns } from "./parent-dashboard-campaigns"
import { ParentDashboardChildrenList } from "./parent-dashboard-children-list"
import { ParentDashboardChocolateTracker } from "./parent-dashboard-chocolate-tracker"
import { ParentDashboardLatestActivities } from "./parent-dashboard-latest-activities"
import { ParentDashboardNotifications } from "./parent-dashboard-notifications"
import { ParentDashboardStats } from "./parent-dashboard-stats"

export function ParentDashboard() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  return (
    <div className="flex flex-col gap-4 -mx-4 md:-mx-6">
      <div className="text-2xl font-semibold px-4">Parent Hub</div>
      <div className="text-sm text-muted-foreground px-4">
        Click on each child below to view their individual progress and details.
      </div>

      <ParentDashboardChildrenList selectedUser={selectedUser} setSelectedUser={setSelectedUser} />

      {selectedUser ? (
        <div className="flex flex-col gap-4 px-4">
          <div className="text-2xl font-semibold">{getUserDisplayName(selectedUser)}&apos;s Profile</div>
          <ParticipantDashboard userId={selectedUser.id} showHeader={false} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
          <div className="grid gap-4 h-fit">
            <ParentDashboardChocolateTracker />
            <ParentDashboardCampaigns />
          </div>

          <div className="grid gap-4 h-fit">
            <ParentDashboardNotifications />
            <ParentDashboardStats />
            <ParentDashboardLatestActivities />
          </div>
        </div>
      )}
    </div>
  )
}
