import { EventCard } from "@/components/events/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

import { ParticipantDashboardSectionTitle } from "./participant-dashboard-section-title"

interface ParticipantDashboardEventsProps {
  userId: string
}

export function ParticipantDashboardEvents({ userId }: ParticipantDashboardEventsProps) {
  const { data: nextEvent, isLoading } = api.events.getNextEventByUserId.useQuery({ userId }, { enabled: !!userId })

  if (isLoading) {
    return <Skeleton className="w-full h-48" />
  }

  if (!nextEvent) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 md:bg-muted md:rounded-lg md:p-4">
      <ParticipantDashboardSectionTitle
        title="Unlock Next Event"
        description="Enjoy the next super fun event that you can go to!"
        viewAllRoute="/dashboard/prizes#events"
      />

      <EventCard event={nextEvent} showViewDetails />
    </div>
  )
}
