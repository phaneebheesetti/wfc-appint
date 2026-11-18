import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"
import { toastError } from "@/utils/errors"

interface CampaignUsersDeleteProps {
  campaignUser: CampaignUserWithComputedFields
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function CampaignsUsersDelete({ campaignUser, open, onOpenChange, onDelete }: CampaignUsersDeleteProps) {
  const utils = api.useUtils()

  const { mutate: deleteCampaignUser, isPending } = api.campaignsUsers.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success("Participant removed from fundraiser successfully")
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
      void utils.campaignsUsers.listUserIdsByCampaignId.invalidate()
      onDelete?.()
    },
  })

  const handleDelete = () => {
    if (campaignUser.casesCheckedOutQuantity && campaignUser.casesCheckedOutQuantity > 0) {
      toastError({
        error: new Error(
          "Participant has cases checked out. Please delete cases checked out, as appropriate, before deleting participant."
        ),
      })
      return
    }

    if (campaignUser.totalPaidCents && campaignUser.totalPaidCents > 0) {
      toastError({
        error: new Error(
          "Participant has payments logged. Please delete payment transactions, as appropriate, before deleting participant. NOTE: Digital payments cannot be deleted."
        ),
      })
      return
    }

    deleteCampaignUser({ id: campaignUser.id })
  }

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        handleDelete()
      }}
      title="Remove Participant from Fundraiser"
      confirmText={isPending ? "Removing..." : "Remove"}
      isPending={isPending}
    />
  )
}
