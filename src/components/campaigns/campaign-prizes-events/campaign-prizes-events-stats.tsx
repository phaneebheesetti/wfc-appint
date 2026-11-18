import { Goal, Lock, Trophy } from "lucide-react"

import { Card } from "@/components/ui/card/card"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignPrizesEventsStatsProps {
  user: User
  campaign: Campaign
}

export function CampaignPrizesEventsStats({ user, campaign }: CampaignPrizesEventsStatsProps) {
  const { data: currentPrize, isLoading: isLoadingCurrentPrize } = api.prizes.getCurrentPrizeByUserId.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  const { data: nextPrize, isLoading: isLoadingNextPrize } = api.prizes.getNextPrizeByUserId.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  const isLoading = isLoadingCurrentPrize || isLoadingNextPrize

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="w-1/2 h-40" />
        <Skeleton className="w-1/2 h-40" />
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <Card className="flex w-1/2 flex-col items-start gap-6 border-none p-6 bg-blue-50">
        <Trophy className="text-chart-5" />
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">Your prize is:</div>
          <div className="text-3xl font-semibold">{currentPrize?.name ?? "-"}</div>
        </div>
      </Card>

      <div className="relative w-1/2">
        <div className="z-10 absolute top-0 right-0 left-0 bottom-0 border border-orange-500 border-dashed rounded-lg" />

        <Card className="relative z-20 flex h-full flex-1 flex-col items-start gap-6 border-none p-6 bg-orange-50 rotate-[8deg] shadow-elev-3">
          <div className="flex justify-between items-center w-full">
            <Goal className="text-chart-5" />
            <Lock className="text-muted-foreground size-5" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">Next up:</div>
            <div className="text-3xl font-semibold">{nextPrize?.name ?? "-"}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
