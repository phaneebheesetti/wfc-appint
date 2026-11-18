import { Address } from "@/components/ui/address"
import { ImageWithFallback } from "@/components/ui/image"
import { FieldText } from "@/components/ui/text"
import { EVENT_GOAL_TYPE_DETAILS, EventGoalTypeEnum } from "@/constants/events"
import { type Event } from "@/server/db/schema"
import { formatDate } from "@/utils/date"

interface EventsViewProps {
  event: Event
}

export function EventsView({ event }: EventsViewProps) {
  const goalType = event.goalType as EventGoalTypeEnum
  const goalLabel = EVENT_GOAL_TYPE_DETAILS[goalType].label
  const casesGoal = event.casesGoal ?? 0

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Event ID" value={event.id} adminOnly />

      <FieldText label="Event Name" value={event.name} />

      {event.imageUrl && (
        <div className="text-sm flex gap-2 flex-col font-medium">
          Event Image:
          <div className="relative h-44 w-44 overflow-hidden rounded-lg">
            <ImageWithFallback
              src={event.imageUrl}
              alt={event.name}
              fill
              sizes="240px"
              className="object-cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      )}

      {event.description && <FieldText label="Description" value={event.description} />}

      <FieldText label="Participant Eligibility" value={goalLabel} />

      {casesGoal > 0 && <FieldText label="Cases Goal" value={casesGoal} />}

      {goalType === EventGoalTypeEnum.PRIZE_QUALIFICATION && (
        <FieldText label="Prize" value={event.prize?.name ?? "No associated prize"} />
      )}

      {event.isOnlineEvent && (
        <FieldText
          valueClassName="first-letter:lowercase"
          label="Online Event URL"
          value={event.onlineEventUrl ?? ""}
        />
      )}

      {!event.isOnlineEvent && (
        <>
          <FieldText label="Date" value={event?.date ? formatDate(event.date) : "TBD"} />
          <FieldText label="Prize" value={event.prize?.name ?? "No associated prize"} />
          <FieldText label="Status" value={event.active ? "Active" : "Inactive"} />{" "}
          <FieldText
            label="Address"
            value={
              <Address
                street={event?.street ?? ""}
                city={event?.city ?? ""}
                state={event?.state ?? ""}
                postalCode={event?.postalCode ?? ""}
              />
            }
          />
        </>
      )}
    </div>
  )
}
