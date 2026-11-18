import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { OrganizationsPermissionsEnum } from "@/constants/permissions"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Organization, type User } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { OrganizationsDelete } from "./organizations-delete"
import { OrganizationsForm } from "./organizations-form"
import { OrganizationsView } from "./organizations-view"

interface OrganizationsActionsProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationFCDetails: User
  fundraisingConsultantUsers: User[]
}

type Actions = "view" | "update" | "delete"

export function OrganizationsActions({
  organization,
  open,
  onOpenChange,
  organizationFCDetails,
  fundraisingConsultantUsers,
}: OrganizationsActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")
  const utils = api.useUtils()
  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, OrganizationsPermissionsEnum)

  const onUpdate = () => {
    onOpenChange(false)
    void utils.organizations.invalidate()
  }

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={organization.name} description="Organization">
      {action === "update" && (
        <OrganizationsForm
          fundraisingConsultantUsers={fundraisingConsultantUsers}
          organization={organization}
          onBack={() => setAction("view")}
          onUpdate={() => onUpdate()}
          disableNameTypeahead
        />
      )}

      {action !== "update" && (
        <>
          <OrganizationsView organization={organization} organizationFCDetails={organizationFCDetails} />

          <div className="flex gap-2">
            {canUpdate && role !== RolesEnum.SALES_REPRESENTATIVE && (
              <UpdateButton onClick={() => setAction("update")} />
            )}
            {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
          </div>
        </>
      )}

      <OrganizationsDelete
        organization={organization}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => onOpenChange(false)}
      />
    </SheetSimple>
  )
}
