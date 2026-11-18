import { EventCard } from "@/components/events/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface ParticipantEventsListProps {
  userId: string
}

export function ParticipantEventsList({ userId }: ParticipantEventsListProps) {
  const { data: events = [], isLoading } = api.events.listByUserId.useQuery({ userId }, { enabled: !!userId })

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
      </div>
    )

  if (events.length === 0) return <div className="text-sm text-muted-foreground">No events found</div>

  return (
    <div className="flex flex-col gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
