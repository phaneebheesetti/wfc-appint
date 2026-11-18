import { EventCard } from "@/components/events/event-card"
import { Skeleton } from "@/components/ui/skeleton"
import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignDashboardEventsProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboardEvents({ user, campaign }: CampaignDashboardEventsProps) {
  const { data: nextEvent, isLoading } = api.events.getNextEventByUserId.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  if (isLoading) {
    return <Skeleton className="w-full h-48 " />
  }

  if (!nextEvent) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">Unlock Next Event</div>

      <EventCard event={nextEvent} showViewDetails />
    </div>
  )
}
