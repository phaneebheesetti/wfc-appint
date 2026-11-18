import { Info, UserRoundCheck, UserRoundX } from "lucide-react"
import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { TabsSimple } from "@/components/ui/tabs/tabs-simple"
import { PrizesPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Prize } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { PrizesDelete } from "./prizes-delete"
import { PrizesForm } from "./prizes-form"
import { PrizesParticipantsList } from "./prizes-participants-list"
import { PrizesView } from "./prizes-view"

interface PrizesActionsProps {
  organizationId: string
  campaignId: string
  prize: Prize
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignIsActive: boolean
}

type Actions = "view" | "update" | "delete"

export function PrizesActions({
  organizationId,
  campaignId,
  prize,
  open,
  onOpenChange,
  campaignIsActive,
}: PrizesActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")
  const utils = api.useUtils()

  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, PrizesPermissionsEnum)

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={prize.name} description="Prize">
      {action === "update" && (
        <PrizesForm
          organizationId={organizationId}
          campaignId={campaignId}
          prize={prize}
          onBack={() => setAction("view")}
          onUpdate={() => {
            onOpenChange(false)
            void utils.prizes.listByCampaignId.invalidate()
            void utils.campaigns.getPrizesOverview.invalidate()
            void utils.campaigns.getParticipantsByEvent.invalidate()
          }}
        />
      )}

      {action !== "update" && (
        <TabsSimple
          defaultTab="prize-info"
          tabsListClassName="md:flex-col"
          tabsTriggerClassName="md:w-full"
          tabs={[
            {
              label: "Information",
              value: "prize-info",
              content: (
                <>
                  <PrizesView prize={prize} />

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
              value: "prize-participants-paid",
              content: <PrizesParticipantsList prize={prize} type="eligible" />,
              icon: UserRoundCheck,
            },
            {
              label: "Participants Unpaid",
              value: "prize-participants-unpaid",
              content: <PrizesParticipantsList prize={prize} type="unpaid" />,
              icon: UserRoundX,
            },
          ]}
        />
      )}

      <PrizesDelete
        prize={prize}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)
          void utils.prizes.listByCampaignId.invalidate()
          void utils.campaigns.getPrizesOverview.invalidate()
          void utils.campaigns.getParticipantsByEvent.invalidate()
        }}
      />
    </SheetSimple>
  )
}
