import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface UsersDeleteProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function UsersDelete({ user, open, onOpenChange, onDelete }: UsersDeleteProps) {
  const { mutate: deleteUser, isPending } = api.users.delete.useMutation({
    onSuccess: async () => {
      onOpenChange(false)
      onDelete?.()
      toast.success("Member deleted successfully")
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteUser({ id: user.id })
      }}
      title="Delete member"
      description="This will permanently remove the member and all their data from the system. This action cannot be undone."
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
