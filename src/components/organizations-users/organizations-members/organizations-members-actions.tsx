import { useState } from "react"
import { toast } from "sonner"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { UsersForm, UsersView } from "@/components/users"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type OrganizationUser, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { OrganizationsMembersDeleteReassign } from "./organizations-members-delete-reassign"

interface OrganizationsMembersActionsProps {
  organizationUser: OrganizationUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Actions = "view" | "update" | "delete"

export function OrganizationsMembersActions({
  organizationUser,
  open,
  onOpenChange,
}: OrganizationsMembersActionsProps) {
  const utils = api.useUtils()

  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null

  const allowedRoles = [
    RolesEnum.ADMIN,
    RolesEnum.WFC_ADMIN,
    RolesEnum.ORGANIZATION_ADMIN,
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
      description="Organization Member"
    >
      {organizationUser.user && action === "update" && (
        <UsersForm
          user={organizationUser.user}
          onBack={() => setAction("view")}
          onUpdate={() => {
            void utils.organizationsUsers.getAllMembers.invalidate()
            void utils.organizationsUsers.getAdmin.invalidate()
            onOpenChange(false)
          }}
        />
      )}

      {organizationUser.user && action !== "update" && (
        <>
          <UsersView
            user={{
              ...organizationUser.user,
              invitedByUser: (organizationUser as unknown as User).invitedByUser,
            }}
          />

          <div className="flex gap-2">
            {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
            {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
          </div>
        </>
      )}

      <OrganizationsMembersDeleteReassign
        organizationUser={organizationUser}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)

          toast.success("Member removed from organization successfully")

          void utils.organizationsUsers.getAllMembers.invalidate()
        }}
      />
    </SheetSimple>
  )
}
