"use client"

import { TRPCClientError } from "@trpc/client"
import { toast } from "sonner"

import { InviteForm } from "@/components/users/invite-form"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface OrganizationsMembersInviteFormProps {
  organizationId: string
  onCreate?: (user: User) => Promise<void>
  // Roles the invite form may assign. Defaults to Organization Admin + Staff; the admin-reassignment flow
  // narrows this to Organization Admin only.
  inviteRoles?: RolesEnum[]
}

export function OrganizationsMembersInviteForm({
  organizationId,
  onCreate,
  inviteRoles = [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
}: OrganizationsMembersInviteFormProps) {
  const { loggedInUserId } = useLoggedInUser()
  const utils = api.useUtils()

  const { mutateAsync: inviteUser } = api.users.findUpdateOrInvite.useMutation()
  const { mutateAsync: createOrganizationUser } = api.organizationsUsers.create.useMutation()
  const { mutateAsync: updateOrganization } = api.organizations.update.useMutation()

  const handleCreateUser = async (data: { email: string; role: RolesEnum }) => {
    const firstName = data.email.split("@")[0]

    const createdUser = await inviteUser({
      status: UsersStatusEnum.PENDING,
      invitedByUserId: loggedInUserId,
      ...data,
      firstName: firstName,
      fullName: firstName,
    })
    if (!createdUser?.id) throw new Error("Failed to create member")

    const wasFreshInvite = Boolean(createdUser.clerkInvitationUrl)
    toast.success(wasFreshInvite ? "Invitation email sent" : "Member added", {
      description: (
        <div>
          {wasFreshInvite ? "We sent an invitation link to:" : "Added to this organization:"}
          <br />
          <i>{data.email}</i>
        </div>
      ),
    })

    return createdUser
  }

  const onSubmit = async (data: { email: string; role: RolesEnum }) => {
    try {
      // staleTime: 0 forces a fresh read instead of the 30s-cached result — otherwise a remove-then-re-add
      // (Step 5) misses the still-existing user and tries to re-create it, hitting users_email_role_unique.
      const existingUsers = await utils.users.listByEmailOrPhone.fetch(
        { emails: data?.email ? [data.email] : [] },
        { staleTime: 0 }
      )

      // Reuse the existing row only when it already holds the exact role we're inviting (a removed row is
      // still reused so previously-removed admins/staff can be added back). Every other case — a different
      // role, a multi-role clone, or a restricted account like a Fundraising Consultant / WFC Admin — is
      // deferred to findUpdateOrInvite so the rules and error messages stay identical to the members table.
      const existingUser = existingUsers?.find(user => user.role === data.role)

      if (existingUser) {
        const isDeleted = Boolean(existingUser.deletedAt) || existingUser.status === UsersStatusEnum.DELETED
        const isInactive = existingUser.status === UsersStatusEnum.INACTIVE
        if (isDeleted || isInactive) {
          toast.warning(
            isDeleted
              ? "This user has been deleted and can't be invited."
              : "This user is inactive and can't be invited."
          )
          return
        }
      }

      let userId = existingUser?.id ?? null

      if (!userId) {
        const createdUser = await handleCreateUser(data)
        userId = createdUser.id
      }

      // staleTime: 0 forces a DB roundtrip so a same-session re-add (after the
      // first invite cached null) sees the just-created row and produces the
      // warning toast instead of falling through to a unique-constraint error.
      const existingOrganizationUser = await utils.organizationsUsers.getByUserAndOrganizationId.fetch(
        { userId, organizationId },
        { staleTime: 0 }
      )

      if (existingOrganizationUser) {
        toast.warning(`This user is already ${ROLES_DETAILS[data.role].label} in this organization`)
        return
      }

      await createOrganizationUser({
        userId,
        organizationId,
      })

      await utils.organizationsUsers.getByUserAndOrganizationId.invalidate({ userId, organizationId })

      const user = await utils.users.getById.fetch({ id: userId })
      if (!user) throw new Error("User not found")

      const organization = await utils.organizations.getById.fetch({ id: organizationId })
      if (!organization) throw new Error("Organization not found")

      // Only seed the org's primary admin with an Organization Admin — the sponsor-reassignment flow can
      // invite Org Staff too, and a staff member must never become adminUserId.
      if (!organization.adminUserId && data.role === RolesEnum.ORGANIZATION_ADMIN) {
        await updateOrganization({
          id: organizationId,
          adminUserId: userId,
        })
      }

      await onCreate?.(user)
    } catch (error) {
      if (error instanceof TRPCClientError) return
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  return (
    <InviteForm onSubmit={onSubmit} defaultRole={inviteRoles[0] ?? RolesEnum.ORGANIZATION_ADMIN} roles={inviteRoles} />
  )
}
