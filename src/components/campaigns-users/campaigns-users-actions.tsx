import { CircleDollarSign, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { OrganizationUsersForm } from "@/components/organizations-users"
import { ParticipantQRCode } from "@/components/participant/participant-qr-code"
import { CampaignUserTransactions } from "@/components/payment-logs"
import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { TabsSimple } from "@/components/ui/tabs"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

import { CampaignsUsersDelete } from "./campaigns-users-delete"
import { CampaignsUsersView } from "./campaigns-users-view"

interface CampaignsUsersActionsProps {
  campaignUser: CampaignUserWithComputedFields
  campaignId: string
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignIsActive: boolean
  campaignHasDigitalPayment: boolean
  setSelectedUser: React.Dispatch<React.SetStateAction<CampaignUserWithComputedFields | null>>
}

type Actions = "view" | "update" | "delete"

export function CampaignsUsersActions({
  campaignUser,
  campaignId,
  organizationId,
  open,
  onOpenChange,
  campaignIsActive,
  campaignHasDigitalPayment,
  setSelectedUser,
}: CampaignsUsersActionsProps) {
  const utils = api.useUtils()

  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  if (!role) return null

  const allowedRoles = [
    RolesEnum.ADMIN,
    RolesEnum.WFC_ADMIN,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.SALES_MANAGER,
    RolesEnum.SALES_REPRESENTATIVE,
  ]
  const maskParticipantPii = shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
  const canUpdate = RolesEnum.ORGANIZATION_ADMIN === role && !maskParticipantPii
  const canDelete = allowedRoles.includes(role)

  const sheetTitleUser =
    maskParticipantPii && campaignUser.user ? maskParticipantUserPii(campaignUser.user) : campaignUser.user

  return (
    <SheetSimple
      open={open}
      onOpenChange={onOpenChange}
      title={getUserDisplayName(sheetTitleUser)}
      description="Fundraiser Participant"
    >
      <TabsSimple
        tabs={[
          {
            label: "Information",
            value: "campaigns-users-information",
            content: (
              <>
                {campaignUser.user && action === "update" && (
                  <OrganizationUsersForm
                    user={campaignUser.user}
                    campaignId={campaignId}
                    organizationId={organizationId}
                    onBack={() => setAction("view")}
                    onCreate={() => utils.campaignsUsers.listPaginatedByCampaignId.invalidate()}
                    onUpdate={() => {
                      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
                      void utils.organizationsUsers.getByUserAndOrganizationId.invalidate()
                      void utils.participantParentMapping.listByParticipantId.invalidate()
                      toast.success("Participant updated successfully")
                      setAction("view")
                    }}
                  />
                )}

                {campaignUser.user && action !== "update" && (
                  <div className="flex flex-col gap-6">
                    <CampaignsUsersView
                      campaignUser={campaignUser}
                      campaignHasDigitalPayment={campaignHasDigitalPayment}
                      maskParticipantPii={maskParticipantPii}
                      setSelectedUser={setSelectedUser}
                    />

                    {campaignIsActive && (
                      <div className="flex gap-2">
                        {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
                        {canDelete && <DeleteButton onClick={() => setAction("delete")}>Remove</DeleteButton>}
                      </div>
                    )}

                    {campaignUser.user?.pin && campaignHasDigitalPayment && (
                      <ParticipantQRCode pin={campaignUser.user.pin} />
                    )}
                  </div>
                )}
              </>
            ),
            icon: Info,
          },
          {
            label: "Transactions",
            value: "campaigns-users-transactions",
            content: <CampaignUserTransactions campaignId={campaignId} userId={campaignUser.user?.id ?? ""} />,
            icon: CircleDollarSign,
          },
        ]}
      />

      <CampaignsUsersDelete
        campaignUser={campaignUser}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => onOpenChange(false)}
      />
    </SheetSimple>
  )
}
