"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Calendar } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { ImageWithFallback } from "@/components/ui/image"
import { EVENT_GOAL_TYPE_DETAILS, EventGoalTypeEnum } from "@/constants/events"
import { EventsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks"
import { type Event } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"

import { EventsActions } from "./events-actions"
import { EventsCreate } from "./events-create"

interface EventsListProps {
  organizationId: string
  campaignId: string
  campaignIsActive: boolean
}

export function EventsList({ organizationId, campaignId, campaignIsActive }: EventsListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const utils = api.useUtils()

  const [createEvent, setCreateEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const { data: events, isLoading } = api.events.listByCampaignId.useQuery({ campaignId })
  const { data: eventsOverview } = api.campaigns.getEventsOverview.useQuery({
    campaignId,
  })

  if (!role) return null
  const { canCreate } = getResourcePermissions(role, EventsPermissionsEnum)

  const columns: ColumnDef<Event>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: props => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 rounded-md overflow-hidden">
            <ImageWithFallback
              src={props.row.original.imageUrl ?? ""}
              alt={props.row.original.name}
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-medium truncate max-w-[200px]">{props.row.original.name}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[200px]">{props.row.original.description}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "goalType",
      sortingFn: (rowA, rowB) => {
        const casesGoalA = rowA.original.casesGoal ?? 0
        const casesGoalB = rowB.original.casesGoal ?? 0

        return casesGoalA - casesGoalB
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Event Goal" />,
      cell: props => {
        const casesGoal = props.row.original.casesGoal ?? 0
        const goalType = props.row.original.goalType as EventGoalTypeEnum

        return (
          <div className="flex items-center gap-1">
            <div className="text-sm text-muted-foreground">{EVENT_GOAL_TYPE_DETAILS[goalType].label}</div>
            {casesGoal > 0 && (
              <div className="w-full text-sm text-muted-foreground">({props.row.original.casesGoal} cases)</div>
            )}
            {goalType === EventGoalTypeEnum.PRIZE_QUALIFICATION && props.row.original.prize && (
              <div className="text-sm text-muted-foreground">
                <div>{props.row.original.prize.name}</div>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: props => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{props.row.original.date ? formatDate(props.row.original.date) : "TBD"}</span>
        </div>
      ),
    },
    {
      accessorKey: "participants",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Participants" />,
      cell: props => {
        const eventId = props.row.original.id
        const participantsCount = eventsOverview?.eventsInfoById?.[eventId ?? ""]?.participants?.eligibleCount ?? 0

        return <div className="flex items-center gap-2">{participantsCount}</div>
      },
    },
    {
      accessorKey: "active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
      cell: props => <DataTableCell {...props} type="boolean" />,
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedEvent(row.original)} />,
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Events</h2>
      </div>

      <DataTable
        id="events-list-"
        data={events ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Bring your fundraiser to life",
          description:
            "Events help create excitement, engage supporters, and keep everyone\naligned throughout your fundraising journey. Schedule important dates and\nactivities in one place.",
          icon: Calendar,
          proTip: "Kickoff events and milestone celebrations can help increase participation and maintain momentum.",
          searchTitle: "No Events",
          buttonText: "Add Event",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Event",
                onClick: () => setCreateEvent(true),
                disabled: !campaignIsActive,
              }
            : undefined
        }
        loading={isLoading}
        columns={columns}
        multiColumnFilter={{
          columns: [{ accessorKey: "name", name: "Name" }],
        }}
      />

      {createEvent && (
        <EventsCreate
          open={createEvent}
          onOpenChange={() => {
            setCreateEvent(false)
            void utils.events.listByCampaignId.invalidate()
          }}
          organizationId={organizationId}
          campaignId={campaignId}
        />
      )}

      {selectedEvent && (
        <EventsActions
          organizationId={organizationId}
          campaignId={campaignId}
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={() => setSelectedEvent(null)}
          campaignIsActive={campaignIsActive}
        />
      )}
    </>
  )
}
