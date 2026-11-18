import copy from "copy-to-clipboard"
import { Copy, Mail } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface UsersInvitationEmailActionsProps {
  user: User
  setUser?: (user: User | null) => void
  organizationId?: string
  campaignId?: string
}

export function UsersInvitationEmailActions({
  user,
  setUser,
  organizationId,
  campaignId,
}: UsersInvitationEmailActionsProps) {
  const [isSendingSignUpEmail, setIsSendingSignUpEmail] = useState(false)

  const { mutateAsync: updateUser } = api.users.update.useMutation()

  async function sendSignUpEmail(email: string) {
    setIsSendingSignUpEmail(true)

    const response = await fetch("/api/clerk/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email,
        phone: user?.phone ?? undefined,
        role: user.role,
        databaseId: user.id,
        notify: user.role !== RolesEnum.PARENT,
      }),
    })
    const data = (await response.json()) as { data: { url: string; email: string } }

    await updateUser({ id: user.id, clerkInvitationUrl: data.data.url, clerkInvitationSentAt: new Date() })

    setUser?.({ ...user, clerkInvitationUrl: data.data.url, clerkInvitationSentAt: new Date() })

    if (user.role === RolesEnum.PARENT && organizationId && campaignId) {
      await fetch("/api/email/send/welcome-parent", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          clerkId: user.clerkId,
        }),
      })
    }

    toast.success("Invitation sent", {
      description: (
        <div>
          We sent an invitation link to:
          <br />
          <i>{email}</i>
        </div>
      ),
    })

    setIsSendingSignUpEmail(false)
  }

  const copyInvitationLink = () => {
    copy(user.clerkInvitationUrl ?? "")
    toast.success("Invitation link copied to clipboard", {
      description: "Share this invitation link with the person so they can complete their registration.",
    })
  }

  if (!user.email || (user.status as UsersStatusEnum) !== UsersStatusEnum.PENDING) {
    return null
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isSendingSignUpEmail}
        onClick={() => sendSignUpEmail(user.email ?? "")}
      >
        <Mail />
        {isSendingSignUpEmail
          ? "Sending..."
          : user.clerkInvitationSentAt
            ? "Resend Invitation Email"
            : "Send Invitation Email"}
      </Button>

      {user.clerkInvitationUrl && (
        <Button variant="outline" size="sm" className="w-full" onClick={copyInvitationLink}>
          <Copy />
          Copy Invitation Link
        </Button>
      )}
    </div>
  )
}
