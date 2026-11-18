import { Box, Megaphone } from "lucide-react"
import { useMemo } from "react"

import { Card } from "@/components/ui/card"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

export function ParentDashboardStats() {
  const { loggedInUserId } = useLoggedInUser()

  const { data: aggregatedData = [], isLoading } = api.casesTransactions.getAggregatedByParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId }
  )

  const familyStats = useMemo(() => {
    if (!aggregatedData) return { totalCasesCheckedOut: 0, activeCampaigns: 0 }

    const totalCasesCheckedOut = aggregatedData.reduce((sum, campaign) => {
      return sum + campaign.totalCasesCheckedOut
    }, 0)

    const activeCampaigns = aggregatedData.length

    return { totalCasesCheckedOut, activeCampaigns }
  }, [aggregatedData])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Family Stats</h2>

      <div className="flex gap-2">
        <Card className="flex flex-1 flex-col items-start gap-6 border border-lg p-6 bg-muted">
          <Box className="text-chart-1" />
          <div className="flex flex-col gap-2">
            <div className="text-3xl font-semibold">{isLoading ? "..." : familyStats.totalCasesCheckedOut}</div>
            <div className="font-semibold tracking-tighter">Total Cases Checked Out</div>
            <div className="text-xs text-muted-foreground">All cases checked on all fundraisers</div>
          </div>
        </Card>

        <Card className="flex flex-1 flex-col items-start gap-6 border border-lg p-6 bg-muted">
          <Megaphone className="text-chart-5" />
          <div className="flex flex-col gap-2">
            <div className="text-3xl font-semibold">{isLoading ? "..." : familyStats.activeCampaigns}</div>
            <div className="font-semibold tracking-tighter">Active Fundraisers</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
