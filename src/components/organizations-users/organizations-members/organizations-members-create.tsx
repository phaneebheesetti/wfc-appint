import { User as UserIcon } from "lucide-react"

import { Modal } from "@/components/ui/modal"
import { api } from "@/trpc/react"

import { OrganizationsMembersInviteForm } from "./organizations-members-invite-form"

interface OrganizationsMembersCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

export function OrganizationsMembersCreate({ open, onOpenChange, organizationId }: OrganizationsMembersCreateProps) {
  const utils = api.useUtils()

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Organization Member"
      description="Invite someone into this organization."
      icon={UserIcon}
      iconClassName="text-green-500"
    >
      <OrganizationsMembersInviteForm
        organizationId={organizationId}
        onCreate={async () => {
          void utils.users.listPaginated.invalidate()
          void utils.organizationsUsers.getAllMembers.invalidate()
          void utils.organizations.getById.invalidate()

          onOpenChange(false)
        }}
      />
    </Modal>
  )
}
