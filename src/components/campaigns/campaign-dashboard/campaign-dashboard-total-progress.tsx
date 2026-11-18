import { CircleDollarSign } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { type Campaign } from "@/server/db/schema"
import { getTotalCasesCheckedOut, getTotalCasesDelivered } from "@/utils/cases-transactions"

interface CampaignDashboardTotalProgressProps {
  campaign: Campaign
}

export function CampaignDashboardTotalProgress({ campaign }: CampaignDashboardTotalProgressProps) {
  const casesDelivered = getTotalCasesDelivered(campaign?.casesTransactions ?? [])
  const casesCheckedOut = getTotalCasesCheckedOut(campaign?.casesTransactions ?? [])

  const percent = Math.round((casesCheckedOut / casesDelivered) * 100)

  return (
    <div className="bg-blue-50 rounded-card p-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground text-sm">Total Fundraiser Progress</div>
        <CircleDollarSign className="text-chart-2" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-3xl font-semibold">{percent}%</div>

        <Progress value={percent} className="[&>*]:bg-brown-500 bg-blue-100" showPercentage />

        <div className="text-xs">
          Cases Checked Out X Cases Goal: {casesCheckedOut} / {casesDelivered}
        </div>
      </div>
    </div>
  )
}
