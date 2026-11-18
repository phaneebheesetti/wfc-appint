import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type OrganizationUser } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface OrganizationsUsersDeleteProps {
  organizationUser: OrganizationUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function OrganizationsUsersDelete({
  organizationUser,
  open,
  onOpenChange,
  onDelete,
}: OrganizationsUsersDeleteProps) {
  const { mutate: deleteOrganizationUser, isPending } = api.organizationsUsers.delete.useMutation({
    onSuccess: async () => {
      onOpenChange(false)

      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteOrganizationUser({ id: organizationUser.id })
      }}
      confirmText={isPending ? "Removing..." : "Remove"}
      title="Remove from organization"
      isPending={isPending}
    />
  )
}
