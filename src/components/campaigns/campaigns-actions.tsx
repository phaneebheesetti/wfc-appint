import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { CampaignsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Campaign } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { CampaignsDelete } from "./campaigns-delete"
import { CampaignsForm } from "./campaigns-form"
import { CampaignsView } from "./campaigns-view"

interface CampaignsActionsProps {
  organizationId: string
  campaign: Campaign
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Actions = "view" | "update" | "delete"

export function CampaignsActions({ organizationId, campaign, open, onOpenChange }: CampaignsActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null
  const canEditCampaign = campaign.status === String(CampaignsStatusEnum.ACTIVE)

  const { canUpdate, canDelete } = getResourcePermissions(role, CampaignsPermissionsEnum)

  const utils = api.useUtils()

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={campaign.name} description="Fundraiser">
      {action === "update" && (
        <CampaignsForm
          organizationId={campaign.organizationId}
          campaign={campaign}
          onBack={() => setAction("view")}
          onUpdate={async () => {
            onOpenChange(false)
            await utils.campaigns.invalidate()
          }}
        />
      )}

      {action !== "update" && (
        <>
          <CampaignsView campaign={campaign} />

          {canEditCampaign && (
            <div className="flex gap-2">
              {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
              {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
            </div>
          )}
        </>
      )}

      <CampaignsDelete
        organizationId={organizationId}
        campaign={campaign}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => onOpenChange(false)}
      />
    </SheetSimple>
  )
}
