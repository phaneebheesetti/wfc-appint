import { UserCheck, UserLock } from "lucide-react"
import { useState } from "react"

import { Button, DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { UsersDeactivate } from "./users-deactivate"
import { UsersDelete } from "./users-delete"
import { UsersForm } from "./users-form"
import { UsersReactivate } from "./users-reactivate"
import { UsersView } from "./users-view"

interface UsersActionsProps {
  user: User
  setUser: (user: User | null) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Actions = "view" | "update" | "deactivate" | "reactivate" | "delete"

export function UsersActions({ user, setUser, open, onOpenChange }: UsersActionsProps) {
  const utils = api.useUtils()

  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null

  const isAdmin = [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN].includes(role)

  const canUpdate = isAdmin
  const canDeactivate = isAdmin && (user.status as UsersStatusEnum) === UsersStatusEnum.ACTIVE
  const canReactivate = isAdmin && (user.status as UsersStatusEnum) === UsersStatusEnum.INACTIVE
  const canDelete = role === RolesEnum.ADMIN && (user.status as UsersStatusEnum) !== UsersStatusEnum.DELETED

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={getUserDisplayName(user)} description="Member">
      {action === "update" && (
        <UsersForm
          user={user}
          onBack={() => setAction("view")}
          onUpdate={() => {
            void utils.users.listPaginated.invalidate()
            onOpenChange(false)
          }}
        />
      )}

      {action !== "update" && (
        <>
          <UsersView user={user} setUser={setUser} />

          <div className="flex gap-2">
            {canUpdate && <UpdateButton onClick={() => setAction("update")} />}

            {canReactivate && (user.status as UsersStatusEnum) === UsersStatusEnum.INACTIVE && (
              <Button variant="success" onClick={() => setAction("reactivate")}>
                <UserCheck /> Reactivate
              </Button>
            )}

            {canDeactivate && (user.status as UsersStatusEnum) !== UsersStatusEnum.INACTIVE && (
              <DeleteButton variant="warning" icon={<UserLock />} onClick={() => setAction("deactivate")}>
                Deactivate
              </DeleteButton>
            )}

            {canDelete && <DeleteButton onClick={() => setAction("delete")}>Delete</DeleteButton>}
          </div>
        </>
      )}

      <UsersDeactivate
        user={user}
        open={action === "deactivate"}
        onOpenChange={() => setAction("view")}
        onDeactivate={() => {
          void utils.users.listPaginated.invalidate()
          onOpenChange(false)
        }}
      />

      <UsersReactivate
        user={user}
        open={action === "reactivate"}
        onOpenChange={() => setAction("view")}
        onReactivate={() => {
          void utils.users.listPaginated.invalidate()
          onOpenChange(false)
        }}
      />

      <UsersDelete
        user={user}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          void utils.users.listPaginated.invalidate()
          onOpenChange(false)
        }}
      />
    </SheetSimple>
  )
}
