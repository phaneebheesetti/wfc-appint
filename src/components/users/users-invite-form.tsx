"use client"

import { TRPCClientError } from "@trpc/client"
import { toast } from "sonner"

import { type RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

import { InviteForm } from "./invite-form"

interface UsersInviteFormProps {
  onCreate?: (user: User) => Promise<void>
  roles?: RolesEnum[]
  defaultRole?: RolesEnum
}

export function UsersInviteForm({ onCreate, roles, defaultRole }: UsersInviteFormProps) {
  const { loggedInUserId } = useLoggedInUser()
  const utils = api.useUtils()

  const { mutateAsync: inviteUser } = api.users.findUpdateOrInvite.useMutation()

  const onSubmit = async (data: { email: string; role: RolesEnum }) => {
    try {
      const existingUsers = await utils.users.listByEmailOrPhone.fetch({
        emails: data?.email ? [data.email] : [],
        roles: [data.role],
      })
      const userId = existingUsers[0]?.id ?? null

      if (userId) {
        toast.warning("This email is already registered with this role.")
        return
      }

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
            {wasFreshInvite ? "We sent an invitation link to:" : "Added:"}
            <br />
            <i>{data.email}</i>
          </div>
        ),
      })

      await onCreate?.(createdUser)
    } catch (error) {
      if (error instanceof TRPCClientError) return
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  return <InviteForm onSubmit={onSubmit} roles={roles} defaultRole={defaultRole} />
}
