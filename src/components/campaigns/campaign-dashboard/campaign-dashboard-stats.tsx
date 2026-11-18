import { Box, Trophy } from "lucide-react"

import { Card } from "@/components/ui/card"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignDashboardStatsProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboardStats({ user, campaign }: CampaignDashboardStatsProps) {
  const { data: currentPrize } = api.prizes.getCurrentPrizeByUserId.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  const { data: casesTransactions = [] } = api.casesTransactions.getAllFromUserAtCampaign.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  const totalCasesCheckedOut =
    casesTransactions
      .filter(transaction => (transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.CHECKOUT)
      .reduce((acc, transaction) => acc + transaction.quantity, 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xl font-semibold">Your Fundraiser Stats</div>

      <div className="flex gap-2">
        <Card className="flex w-1/2 flex-col items-start gap-6 border border-lg p-4 bg-muted">
          <Box className="text-chart-1" />
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-semibold">{totalCasesCheckedOut}</div>
            <div className="font-semibold tracking-tighter">Total Cases Checked Out</div>
            <div className="text-xs text-muted-foreground">All cases checked out in this fundraiser</div>
          </div>
        </Card>

        <Card className="flex w-1/2 flex-col items-start gap-6 border border-lg p-4 bg-muted">
          <Trophy className="text-chart-5" />
          <div className="flex flex-col gap-2">
            <div className="text-2xl font-semibold">{currentPrize?.name ?? "-"}</div>
            <div className="font-semibold tracking-tighter">Prize</div>
            <div className="text-xs text-muted-foreground">this is your current prize</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
