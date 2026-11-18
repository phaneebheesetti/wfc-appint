import { PrizeCard } from "@/components/prizes/prize-card"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignDashboardPrizesProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboardPrizes({ user, campaign }: CampaignDashboardPrizesProps) {
  const { data: nextPrize, isLoading } = api.prizes.getNextPrizeByUserId.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  if (isLoading) {
    return <Skeleton className="w-full h-48 " />
  }

  if (!nextPrize) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">Unlock Next Prize</div>

      <PrizeCard prize={nextPrize} />
    </div>
  )
}
