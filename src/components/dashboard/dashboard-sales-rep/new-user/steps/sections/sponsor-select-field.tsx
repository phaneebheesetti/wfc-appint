"use client"

import { User } from "lucide-react"
import { useState } from "react"

import { OrganizationsMembersInviteForm } from "@/components/organizations-users/organizations-members/organizations-members-invite-form"
import { Modal } from "@/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RolesEnum } from "@/constants/roles"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

// Sentinel select value that opens the invite popup instead of picking an existing member.
const INVITE_NEW = "new"

// Shared sponsor picker (existing member dropdown + "Invite New Sponsor" flow). Used by the FC onboarding
// Step 5 and the Add-Fundraiser popup. Inviting a new sponsor is a real side effect; only the campaign's
// sponsor *assignment* is the caller's responsibility (deferred to commit in the popup).
export function SponsorSelectField({
  organizationId,
  value,
  onChange,
}: {
  organizationId: string
  value: string
  onChange: (memberId: string) => void
}) {
  const utils = api.useUtils()
  const [inviteOpen, setInviteOpen] = useState(false)

  // Existing org admins/staff who can be made sponsor without a fresh invite (mirrors the campaign form).
  const { data: members } = api.organizationsUsers.getAllMembers.useQuery({
    organizationId,
    roles: [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
    activeOnly: true,
  })

  const handleSelect = (selected: string) => {
    // "Invite New Sponsor" only opens the popup; the real selection happens once the invite succeeds.
    if (selected === INVITE_NEW) {
      setInviteOpen(true)
      return
    }
    onChange(selected)
  }

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INVITE_NEW}>Invite a New Administrator</SelectItem>
          {members?.map(({ user }) =>
            user?.id ? (
              <SelectItem key={user.id} value={user.id}>
                {getUserDisplayName(user)}
              </SelectItem>
            ) : null
          )}
        </SelectContent>
      </Select>

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite a New Administrator"
        description="Invite an administrator to support this fundraiser and join your organization"
        icon={User}
        iconClassName="text-green-500"
      >
        <OrganizationsMembersInviteForm
          organizationId={organizationId}
          onCreate={async user => {
            // Surface the freshly invited member in the dropdown and pre-select them.
            await utils.organizationsUsers.getAllMembers.invalidate()
            onChange(user.id)
            setInviteOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}

export { INVITE_NEW }
