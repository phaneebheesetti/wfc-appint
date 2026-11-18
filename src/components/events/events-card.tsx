import { Calendar, CheckCircleIcon, Eye, Users, XCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Card } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/ui/image"
import { Separator } from "@/components/ui/separator"
import { EVENT_GOAL_TYPE_DETAILS, EventGoalTypeEnum } from "@/constants/events"
import { type CampaignEventsStats } from "@/server/api/routers/campaigns"
import { type Event } from "@/server/db/schema"
import { cn } from "@/utils/cn"
import { formatDate } from "@/utils/date"

interface EventCardProps {
  event: Event
  onEdit?: () => void
  eventsStats?: CampaignEventsStats
}

export function EventCard({ event, onEdit, eventsStats }: EventCardProps) {
  const [participants, setParticipants] = useState<number>(0)
  useEffect(() => {
    if (eventsStats?.participantsByCategory) {
      setParticipants(eventsStats.participantsByCategory[event.id ?? ""] ?? 0)
    }
  }, [eventsStats, event.id])

  const casesGoal = event.casesGoal ?? 0
  const goalType = event.goalType as EventGoalTypeEnum
  const goalLabel = EVENT_GOAL_TYPE_DETAILS[goalType].label

  return (
    <Card className="overflow-hidden inline-block w-56">
      <div className="m-4 rounded-card overflow-hidden">
        <div className="relative h-44 w-44 overflow-hidden mx-auto">
          <ImageWithFallback src={event.imageUrl ?? ""} alt={event.name} fill className="object-cover" />
        </div>
      </div>
      <div className="pt-0">
        <div className="flex flex-col gap-2 flex-1 px-4">
          <h3 className="text-base font-medium">{event.name}</h3>
          <div className="mt-4 flex flex-col">
            <div className="text-sm text-muted-foreground">{goalLabel}</div>
            {casesGoal > 0 && <div className="text-sm text-muted-foreground">({casesGoal} cases)</div>}
            {goalType === EventGoalTypeEnum.PRIZE_QUALIFICATION && (
              <div className="text-sm text-muted-foreground">
                <div>{event.prize?.name}</div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-gray-600 text-sm">
            <Calendar className="h-5 w-5" />
            <span>{event?.date ? formatDate(event.date) : "TBD"}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-gray-600 text-sm">
            <Users className="h-5 w-5" />
            <span>Participants: {participants}</span>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="mt-4 flex items-center justify-between px-4 text-sm pb-4 gap-2">
          <div className={cn("flex items-center gap-2", event.active ? "text-green-500" : "text-red-500")}>
            {event.active ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}

            {event.active ? "Active" : "Inactive"}
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-control border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
        </div>
      </div>
    </Card>
  )
}
