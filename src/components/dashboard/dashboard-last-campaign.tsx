import { Eye } from "lucide-react"
import { useRouter } from "next/navigation"

import { CampaignsHeaderCards } from "@/components/campaigns/campaign-header-cards"
import { CampaignsHeader } from "@/components/campaigns/campaigns-header"
import { type Campaign } from "@/server/db/schema"

interface DashboardLatestCampaignProps {
  campaign?: Campaign | null
}

export function DashboardLatestCampaign({ campaign }: DashboardLatestCampaignProps) {
  const router = useRouter()
  if (!campaign) return null

  return (
    <div className="flex flex-col gap-4 bg-gray-100 p-4 rounded-card w-full">
      <div className="text-muted-foreground text-sm">Latest Active Fundraiser</div>

      <CampaignsHeader
        campaignId={campaign?.id ?? ""}
        organizationId={campaign?.organizationId ?? ""}
        ctaButton={{
          icon: Eye,
          text: "View Fundraiser",
          onClick: () => router.push(`/dashboard/organizations/${campaign.organizationId}/campaigns/${campaign.id}`),
        }}
        hideSettingsButton
      />

      <CampaignsHeaderCards campaignId={campaign?.id ?? ""} />
    </div>
  )
}
