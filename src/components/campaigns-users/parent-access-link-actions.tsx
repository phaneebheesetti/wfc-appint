import copy from "copy-to-clipboard"
import { Copy, Mail } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"
import { UsersStatusEnum } from "@/constants/users"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

const ICON_BUTTON_CLASS = "rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8 shrink-0"

export function ParentAccessLinkActions({ parent }: { parent: User }) {
  const [isResending, setIsResending] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const utils = api.useUtils()
  const { mutateAsync: resendInvitationMany } = api.users.resendInvitationMany.useMutation()
  const { mutateAsync: getSignInLink } = api.users.getSignInLink.useMutation()

  const status = parent.status as UsersStatusEnum
  const isActive = status === UsersStatusEnum.ACTIVE
  const isPending = status === UsersStatusEnum.PENDING

  if (!parent.email || (!isActive && !isPending)) return null

  const handleResend = async () => {
    setIsResending(true)
    try {
      const { failedCount, failed } = await resendInvitationMany({ userIds: [parent.id] })
      if (failedCount > 0) {
        toast.error("Failed to send access link", { description: failed[0]?.reason })
      } else {
        toast.success("Invitation sent", {
          description: (
            <div>
              We sent a new {"invitation link"} to:
              <br />
              <i>{parent.email}</i>
            </div>
          ),
        })
      }
      await utils.participantParentMapping.listByParticipantId.invalidate()
    } finally {
      setIsResending(false)
    }
  }

  const handleCopy = async () => {
    if (isPending && parent.clerkInvitationUrl) {
      copy(parent.clerkInvitationUrl)
      toast.success("Invitation link copied to clipboard")
      return
    }

    setIsCopying(true)
    try {
      const { url } = await getSignInLink({ id: parent.id })
      copy(url)
      toast.success("Invitation link copied to clipboard")
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <WithTooltip
        content={isPending ? "Resend Invitation Email" : "Resend Login Email"}
        side="top"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            disabled={isResending}
            onClick={() => void handleResend()}
          >
            <Mail />
          </Button>
        }
      />
      <WithTooltip
        content={isPending ? "Copy Invitation Link" : "Copy Login Link"}
        side="top"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            disabled={isCopying}
            onClick={() => void handleCopy()}
          >
            <Copy />
          </Button>
        }
      />
    </div>
  )
}
