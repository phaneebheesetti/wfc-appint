import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface UsersDeactivateProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeactivate?: () => void
}

export function UsersDeactivate({ user, open, onOpenChange, onDeactivate }: UsersDeactivateProps) {
  const { mutate: deactivateUser, isPending } = api.users.deactivate.useMutation({
    onSuccess: async () => {
      onOpenChange(false)
      onDeactivate?.()
      toast.success("Member deactivated successfully")
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deactivateUser({ id: user.id })
      }}
      title="Deactivate member"
      description="This will prevent the member from logging in to the platform, but his account and data will still be available in the system."
      confirmText={isPending ? "Deactivating..." : "Deactivate"}
      isPending={isPending}
    />
  )
}
