import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type Prize } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { toastError } from "@/utils/errors"

interface PrizesDeleteProps {
  prize: Prize
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function PrizesDelete({ prize, open, onOpenChange, onDelete }: PrizesDeleteProps) {
  const utils = api.useUtils()

  const { mutateAsync: updatePrize } = api.prizes.update.useMutation()

  const { mutate: deletePrize, isPending } = api.prizes.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success("Prize deleted successfully")
      void utils.prizes.listByCampaignId.invalidate()
      onDelete?.()
    },
  })

  const handleDeletePrize = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (prize.nextPrizeId) {
      toastError({
        error: new Error(
          `Cannot delete this prize because another prize (${prize.nextPrize?.name}) depends on it. Please delete the next prize first.`
        ),
      })
      onOpenChange(false)
      return
    }

    if (prize.previousPrizeId) {
      await updatePrize({
        id: prize.previousPrizeId,
        nextPrizeId: null,
      })
    }

    deletePrize({ id: prize.id })
  }

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDeletePrize}
      title="Delete prize"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
