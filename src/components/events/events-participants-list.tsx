"use client"

import { CampaignsPrizesEventsParticipantsList } from "@/components/campaigns-users/campaigns-prizes-events-participants-list"
import { type Event } from "@/server/db/schema"
import { type CampaignEventsOverview } from "@/server/services/campaigns/get-events-overview"
import { api } from "@/trpc/react"
import { getEventReport } from "@/utils/events"

interface EventsParticipantsListProps {
  event: Event
  type: "eligible" | "unpaid"
}

export function EventsParticipantsList({ event, type }: EventsParticipantsListProps) {
  const { data: eventsOverview = {} as CampaignEventsOverview, isLoading } = api.campaigns.getEventsOverview.useQuery({
    campaignId: event.campaignId,
  })

  const eventReport = getEventReport({
    eventId: event.id,
    eventsOverview,
  })

  return (
    <CampaignsPrizesEventsParticipantsList
      eligibleUsers={eventReport?.[type] ?? []}
      prizeOrEventName={event.name}
      isLoading={isLoading}
      type="event"
      campaignId={event.campaignId}
    />
  )
}
