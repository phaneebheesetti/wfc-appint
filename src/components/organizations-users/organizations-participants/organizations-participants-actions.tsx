import { useState } from "react"
import { toast } from "sonner"

import { ParticipantQRCode } from "@/components/participant/participant-qr-code"
import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type OrganizationUser } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { OrganizationUsersForm } from "../organization-users-form"
import { OrganizationsUsersDelete } from "../organizations-users-delete"
import { OrganizationsParticipantsView } from "./organizations-participants-view"

interface OrganizationsParticipantsActionsProps {
  organizationUser: OrganizationUser
  open: boolean
  onOpenChange: (open: boolean) => void
  setSelectedUser: React.Dispatch<React.SetStateAction<OrganizationUser | null>>
}

type Actions = "view" | "update" | "delete"

// This component is not reachable
// UnCommented the ParticipantQRCode as part of WFAL - 455 and WFAL - 472
export function OrganizationsParticipantsActions({
  organizationUser,
  open,
  onOpenChange,
  setSelectedUser,
}: OrganizationsParticipantsActionsProps) {
  const utils = api.useUtils()

  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null

  const allowedRoles = [
    RolesEnum.ADMIN,
    RolesEnum.WFC_ADMIN,
    RolesEnum.ORGANIZATION_ADMIN,
    RolesEnum.ORGANIZATION_STAFF,
    RolesEnum.SALES_MANAGER,
    RolesEnum.SALES_REPRESENTATIVE,
  ]
  const canUpdate = allowedRoles.includes(role)
  const canDelete = allowedRoles.includes(role)

  return (
    <SheetSimple
      open={open}
      onOpenChange={onOpenChange}
      title={getUserDisplayName(organizationUser.user)}
      description="Organization Participant"
    >
      {organizationUser.user && action === "update" && (
        <OrganizationUsersForm
          organizationId={organizationUser.organizationId}
          user={organizationUser.user}
          onBack={() => setAction("view")}
          onCreate={() => utils.organizationsUsers.getAllParticipants.invalidate()}
          onUpdate={() => {
            void utils.organizationsUsers.getAllParticipants.invalidate()
            void utils.organizationsUsers.getByUserAndOrganizationId.invalidate()
            void utils.participantParentMapping.listByParticipantId.invalidate()
            toast.success("Participant updated successfully")
            onOpenChange(false)
          }}
        />
      )}

      {organizationUser.user && action !== "update" && (
        <>
          <OrganizationsParticipantsView organizationUser={organizationUser} setSelectedUser={setSelectedUser} />

          <div className="flex gap-2">
            {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
            {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
          </div>

          {organizationUser.user?.pin && <ParticipantQRCode pin={organizationUser.user.pin} />}
        </>
      )}

      <OrganizationsUsersDelete
        organizationUser={organizationUser}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)

          toast.success("Participant removed from organization successfully")

          void utils.organizationsUsers.getAllParticipants.invalidate()
        }}
      />
    </SheetSimple>
  )
}
