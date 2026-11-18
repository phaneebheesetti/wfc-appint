import { Info, UserRoundCheck, UserRoundX } from "lucide-react"
import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { TabsSimple } from "@/components/ui/tabs/tabs-simple"
import { EventsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Event } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { EventsDelete } from "./events-delete"
import { EventsForm } from "./events-form"
import { EventsParticipantsList } from "./events-participants-list"
import { EventsView } from "./events-view"

interface EventsActionsProps {
  campaignId: string
  organizationId: string
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignIsActive: boolean
}

type Actions = "view" | "update" | "delete"

export function EventsActions({
  campaignId,
  organizationId,
  event,
  open,
  onOpenChange,
  campaignIsActive,
}: EventsActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")
  const utils = api.useUtils()

  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, EventsPermissionsEnum)

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={event.name} description="Event">
      {action === "update" && (
        <EventsForm
          campaignId={campaignId}
          organizationId={organizationId}
          event={event}
          onBack={() => setAction("view")}
          onUpdate={() => {
            onOpenChange(false)
            void utils.events.listByCampaignId.invalidate()
            void utils.campaigns.getPrizesOverview.invalidate()
            void utils.campaigns.getParticipantsByEvent.invalidate()
          }}
        />
      )}

      {action !== "update" && (
        <TabsSimple
          defaultTab="event-info"
          tabsListClassName="md:flex-col"
          tabsTriggerClassName="md:w-full"
          tabs={[
            {
              label: "Information",
              value: "event-info",
              content: (
                <>
                  <EventsView event={event} />

                  {campaignIsActive && (
                    <div className="flex gap-2 mt-4">
                      {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
                      {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
                    </div>
                  )}
                </>
              ),
              icon: Info,
            },
            {
              label: "Participants Paid / Eligible",
              value: "event-participants-paid",
              content: <EventsParticipantsList event={event} type="eligible" />,
              icon: UserRoundCheck,
            },
            {
              label: "Participants Unpaid",
              value: "event-participants-unpaid",
              content: <EventsParticipantsList event={event} type="unpaid" />,
              icon: UserRoundX,
            },
          ]}
        />
      )}

      <EventsDelete
        event={event}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)
          void utils.events.listByCampaignId.invalidate()
          void utils.campaigns.getPrizesOverview.invalidate()
          void utils.campaigns.getParticipantsByEvent.invalidate()
        }}
      />
    </SheetSimple>
  )
}
