import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface UsersReactivateProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onReactivate?: () => void
}

export function UsersReactivate({ user, open, onOpenChange, onReactivate }: UsersReactivateProps) {
  const { mutate: reactivateUser, isPending } = api.users.reactivate.useMutation({
    onSuccess: async () => {
      onOpenChange(false)
      onReactivate?.()
      toast.success("Member reactivated successfully")
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        reactivateUser({ id: user.id })
      }}
      title="Reactivate member"
      confirmText={isPending ? "Reactivating..." : "Reactivate"}
      isPending={isPending}
    />
  )
}
