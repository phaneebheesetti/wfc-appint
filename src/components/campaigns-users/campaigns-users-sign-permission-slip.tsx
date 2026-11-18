import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"

interface CampaignUsersSignPermissionSlipProps {
  campaignUser: CampaignUserWithComputedFields
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignsUsersSignPermissionSlip({
  campaignUser,
  open,
  onOpenChange,
}: CampaignUsersSignPermissionSlipProps) {
  const utils = api.useUtils()

  const { mutate: signPermissionSlip, isPending: isSigningPending } = api.campaignsUsers.signPermissionSlip.useMutation(
    {
      onSuccess: () => {
        onOpenChange(false)
        toast.success("Permission slip signed successfully")
        void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
        void utils.documents.listByCampaignId.invalidate()
      },
    }
  )

  const { mutate: unsignPermissionSlip, isPending: isUnsigningPending } =
    api.campaignsUsers.unsignPermissionSlip.useMutation({
      onSuccess: () => {
        onOpenChange(false)
        toast.success("Permission slip unsigned successfully")
        void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
        void utils.documents.listByCampaignId.invalidate()
      },
    })

  const isPending = campaignUser.permissionSlipSignedAt ? isUnsigningPending : isSigningPending

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()

        if (campaignUser.permissionSlipSignedAt) {
          unsignPermissionSlip({ id: campaignUser.id, campaignId: campaignUser.campaignId })
        } else {
          signPermissionSlip({ id: campaignUser.id, campaignId: campaignUser.campaignId })
        }
      }}
      title={campaignUser.permissionSlipSignedAt ? "Unsign Permission Slip" : "Sign Permission Slip"}
      description={
        campaignUser.permissionSlipSignedAt
          ? "Please confirm you want to mark the permission slip as unsigned for this participant."
          : "Please confirm you want to mark the permission slip as signed for this participant."
      }
      confirmText={
        isPending
          ? campaignUser.permissionSlipSignedAt
            ? "Unsigning..."
            : "Signing..."
          : campaignUser.permissionSlipSignedAt
            ? "Unsign"
            : "Sign"
      }
      isPending={isPending}
    />
  )
}
