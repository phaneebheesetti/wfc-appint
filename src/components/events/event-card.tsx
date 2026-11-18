import { Calendar, Check, Eye, Lock } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/ui/image"
import { Separator } from "@/components/ui/separator"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { EVENT_GOAL_TYPE_DETAILS, type EventGoalTypeEnum } from "@/constants/events"
import { type Event } from "@/server/db/schema"
import { formatDate } from "@/utils/date"

import { EventsView } from "./events-view"

interface EventCardProps {
  event: Event
  eligible?: boolean
  showViewDetails?: boolean
}
export function EventCard({ event, eligible, showViewDetails = false }: EventCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card key={event.id}>
        <div className="flex flex-col gap-4 p-6">
          <div className="relative h-80 w-full overflow-hidden rounded-lg">
            <ImageWithFallback src={event.imageUrl ?? ""} alt={event.name} fill className="object-contain" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="font-semibold">{event.name}</div>
            {event.campaign?.name && <div className="text-sm text-muted-foreground">{event.campaign?.name}</div>}
          </div>

          <Badge className="w-fit">{EVENT_GOAL_TYPE_DETAILS[event.goalType as EventGoalTypeEnum].label}</Badge>

          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Calendar className="h-5 w-5" />
            <span>{event?.date ? formatDate(event.date) : "TBD"}</span>
          </div>
        </div>

        {eligible !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 pb-6">
            {eligible ? (
              <>
                <Check className="text-chart-2" />
                Eligible
              </>
            ) : (
              <>
                <Lock className="text-muted-foreground size-5" />
                Not Eligible
              </>
            )}
          </div>
        )}

        {showViewDetails && (
          <>
            <Separator />
            <div className="p-6">
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Eye />
                View Details
              </Button>
            </div>
          </>
        )}
      </Card>

      <SheetSimple open={open} onOpenChange={setOpen} title={event.name} description="Event">
        <EventsView event={event} />
      </SheetSimple>
    </>
  )
}
