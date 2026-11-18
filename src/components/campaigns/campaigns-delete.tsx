import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import type { Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignsDeleteProps {
  organizationId: string
  campaign: Campaign
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function CampaignsDelete({ organizationId, campaign, open, onOpenChange, onDelete }: CampaignsDeleteProps) {
  const utils = api.useUtils()
  const router = useRouter()

  const { mutate: deleteCampaign, isPending } = api.campaigns.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)

      void utils.campaigns.getByOrganizationId.invalidate()
      void utils.campaigns.getCampaignsByUserId.invalidate()
      void utils.campaigns.getAllFromUserId.invalidate()

      toast.success("Fundraiser deleted successfully")

      router.push(`/dashboard/organizations/${organizationId}`)

      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteCampaign({ id: campaign.id })
      }}
      title="Delete fundraiser"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
