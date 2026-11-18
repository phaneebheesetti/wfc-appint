import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { CASES_TRANSACTIONS_TYPE_DETAILS, type CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { type CasesTransaction } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CasesTransactionsDeleteProps {
  transaction: CasesTransaction
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function CasesTransactionsDelete({ transaction, open, onOpenChange, onDelete }: CasesTransactionsDeleteProps) {
  const utils = api.useUtils()

  const { label } = CASES_TRANSACTIONS_TYPE_DETAILS[transaction.type as CasesTransactionsTypeEnum]

  const { mutate: deleteTransaction, isPending } = api.casesTransactions.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success(`${label} deleted successfully`)
      void utils.casesTransactions.getByCampaignId.invalidate()
      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteTransaction({ id: transaction.id })
      }}
      title={`Delete ${label}`}
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
