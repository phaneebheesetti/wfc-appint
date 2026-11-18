import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type PaymentLog } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface PaymentLogsDeleteProps {
  paymentLog: PaymentLog
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function PaymentLogsDelete({ paymentLog, open, onOpenChange, onDelete }: PaymentLogsDeleteProps) {
  const utils = api.useUtils()

  const { mutate: deletePaymentLog, isPending } = api.paymentLogs.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success("Transaction deleted successfully")
      void utils.paymentLogs.listByCampaignId.invalidate()
      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deletePaymentLog({ id: paymentLog.id })
      }}
      title="Delete transaction"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
