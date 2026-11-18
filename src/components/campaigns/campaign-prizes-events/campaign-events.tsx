import { EventCard } from "@/components/events/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignEventsProps {
  user: User
  campaign: Campaign
}

export function CampaignEvents({ user, campaign }: CampaignEventsProps) {
  const { data: events = [], isLoading: isLoadingEvents } = api.events.listByCampaignId.useQuery(
    { campaignId: campaign.id },
    { enabled: !!campaign.id }
  )

  const { data: participantsByEvent, isLoading: isLoadingParticipantsByEvent } =
    api.campaigns.getParticipantsByEvent.useQuery({ campaignId: campaign.id }, { enabled: !!campaign.id })

  const isLoading = isLoadingEvents || isLoadingParticipantsByEvent

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-full h-48" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">Events</div>
        <div className="text-sm text-muted-foreground">No events found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">Events</div>

      {events.map(event => {
        const eventTier = participantsByEvent?.eventTiers[event.id]
        const isEligible = eventTier?.participantIds.includes(user.id)

        return <EventCard key={event.id} event={event} eligible={isEligible} />
      })}
    </div>
  )
}
