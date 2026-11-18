import { Check, Lock } from "lucide-react"

import { Card } from "@/components/ui/card/card"
import { ImageWithFallback } from "@/components/ui/image"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignPrizesProps {
  user: User
  campaign: Campaign
}

export function CampaignPrizes({ user, campaign }: CampaignPrizesProps) {
  const { data: prizes = [], isLoading: isLoadingPrizes } = api.prizes.listByCampaignId.useQuery(
    { campaignId: campaign.id },
    { enabled: !!campaign.id }
  )

  const { data: prizesOverview, isLoading: isLoadingPrizesOverview } = api.campaigns.getPrizesOverview.useQuery(
    { campaignId: campaign.id },
    { enabled: !!campaign.id }
  )

  const isLoading = isLoadingPrizes || isLoadingPrizesOverview

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-full h-28" />
        <Skeleton className="w-full h-28" />
      </div>
    )
  }

  if (prizes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">Prizes</div>
        <div className="text-sm text-muted-foreground">No prizes found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">Prizes</div>

      {prizes.map(prize => {
        const prizeInfo = prizesOverview?.prizesInfoById[prize.id]
        const isEligible = prizeInfo?.participants?.eligibleIds.includes(user.id)

        return (
          <Card key={prize.id} className="flex items-center justify-between gap-4 p-4">
            <div className="relative size-20 overflow-hidden rounded-lg">
              <ImageWithFallback src={prize.imageUrl ?? ""} alt={prize.name} fill className="object-cover" />
            </div>
            <div className="flex flex-col text-sm flex-1 truncate">
              <div className="truncate font-medium">{prize.name}</div>
              <div className="truncate text-muted-foreground">{prize.description}</div>
            </div>

            {isEligible ? (
              <Check className="size-5 text-green-500" />
            ) : (
              <Lock className="size-5 text-muted-foreground" />
            )}
          </Card>
        )
      })}
    </div>
  )
}
