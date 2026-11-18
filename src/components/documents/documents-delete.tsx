import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type Document } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface DocumentsDeleteProps {
  document: Document
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function DocumentsDelete({ document, open, onOpenChange, onDelete }: DocumentsDeleteProps) {
  const { mutate: deleteDocument, isPending } = api.documents.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success("Document deleted successfully")
      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteDocument({ id: document.id })
      }}
      title="Delete document"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
