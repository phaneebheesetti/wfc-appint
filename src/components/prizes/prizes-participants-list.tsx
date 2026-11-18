"use client"

import { CampaignsPrizesEventsParticipantsList } from "@/components/campaigns-users/campaigns-prizes-events-participants-list"
import { type Prize } from "@/server/db/schema"
import { type CampaignPrizesOverview } from "@/server/services/campaigns/get-prizes-overview"
import { api } from "@/trpc/react"
import { getPrizeReport } from "@/utils/prizes"

interface PrizesParticipantsListProps {
  prize: Prize
  type: "eligible" | "unpaid"
}

export function PrizesParticipantsList({ prize, type }: PrizesParticipantsListProps) {
  const { data: prizesOverview = {} as CampaignPrizesOverview, isLoading } = api.campaigns.getPrizesOverview.useQuery({
    campaignId: prize.campaignId,
  })

  const prizeReport = getPrizeReport({ prizeId: prize.id, prizesOverview })

  return (
    <CampaignsPrizesEventsParticipantsList
      eligibleUsers={prizeReport?.[type] ?? []}
      prizeOrEventName={prize.name}
      isLoading={isLoading}
      type="prize"
      campaignId={prize.campaignId}
    />
  )
}
