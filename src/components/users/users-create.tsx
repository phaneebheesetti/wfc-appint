import { User as UserIcon } from "lucide-react"

import { Modal } from "@/components/ui/modal"
import { UsersInviteForm } from "@/components/users/users-invite-form"
import { type RolesEnum } from "@/constants/roles"
import { api } from "@/trpc/react"

interface UsersCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles?: RolesEnum[]
}

export function UsersCreate({ open, onOpenChange, roles }: UsersCreateProps) {
  const utils = api.useUtils()

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Member"
      description="Invite someone into the platform."
      icon={UserIcon}
      iconClassName="text-green-500"
    >
      <UsersInviteForm
        onCreate={async () => {
          void utils.users.listPaginated.invalidate()
          void utils.organizationsUsers.getAllMembers.invalidate()

          onOpenChange(false)
        }}
        roles={roles}
      />
    </Modal>
  )
}
