import { PrizeCard } from "@/components/prizes/prize-card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

import { ParticipantDashboardSectionTitle } from "./participant-dashboard-section-title"

interface ParticipantDashboardPrizesProps {
  userId: string
}

export function ParticipantDashboardPrizes({ userId }: ParticipantDashboardPrizesProps) {
  const { data: nextPrize, isLoading } = api.prizes.getNextPrizeByUserId.useQuery({ userId }, { enabled: !!userId })

  if (isLoading) {
    return <Skeleton className="w-full h-48" />
  }

  if (!nextPrize) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 md:bg-muted md:rounded-lg md:p-4">
      <ParticipantDashboardSectionTitle
        title="Unlock Next Prize"
        description="Keep going to earn your next reward!"
        viewAllRoute="/dashboard/prizes"
      />

      <PrizeCard prize={nextPrize} />
    </div>
  )
}
