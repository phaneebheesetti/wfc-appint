import { useState } from "react"

import { PageTitle } from "@/components/page-title"
import { Separator } from "@/components/ui/separator"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"

import { DashboardMetricsCampaignCards } from "./dashboard-metrics-campaign-cards"
import { DashboardMetricsCampaignsList } from "./dashboard-metrics-campaigns-list"

export function DashboardMetrics() {
  const { user: loggedInUser } = useLoggedInUser()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={`Hello, ${loggedInUser?.fullName}!`} description="Track overall fundraiser progress" />

      <DashboardMetricsCampaignsList
        selectedCampaignId={selectedCampaignId}
        setSelectedCampaignId={setSelectedCampaignId}
      />

      {selectedCampaignId && (
        <>
          <Separator />
          <DashboardMetricsCampaignCards campaignId={selectedCampaignId} />
        </>
      )}
    </div>
  )
}
