import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type Organization } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface OrganizationsDeleteProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function OrganizationsDelete({ organization, open, onOpenChange, onDelete }: OrganizationsDeleteProps) {
  const utils = api.useUtils()
  const router = useRouter()

  const { mutate: deleteOrganization, isPending } = api.organizations.delete.useMutation({
    onSuccess: async () => {
      onOpenChange(false)

      void utils.organizations.listPaginated.invalidate()
      void utils.organizations.listPaginatedFromUserId.invalidate()
      void utils.campaigns.getByOrganizationId.invalidate()
      void utils.campaigns.getCampaignsByUserId.invalidate()
      void utils.campaigns.getAllFromUserId.invalidate()

      toast.success("Organization deleted successfully")

      router.push("/dashboard/organizations")

      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteOrganization({ id: organization.id })
      }}
      title="Delete organization"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
