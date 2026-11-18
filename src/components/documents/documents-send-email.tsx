import { useState } from "react"
import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { APP_NAME } from "@/constants/app"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { UsersStatusEnum } from "@/constants/users"
import { type Document } from "@/server/db/schema"
import { type CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"

interface DocumentsSendEmailProps {
  document: Document
  campaignUser: CampaignUserWithComputedFields
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentsSendEmail({ document, campaignUser, open, onOpenChange }: DocumentsSendEmailProps) {
  const utils = api.useUtils()
  const [isPending, setIsPending] = useState(false)

  const { mutateAsync: createDocumentsUser } = api.documentsUsers.create.useMutation()
  const { mutateAsync: updateDocumentsUser } = api.documentsUsers.update.useMutation()

  const handleSendEmail = async () => {
    try {
      setIsPending(true)

      const documentsUsers = await utils.documentsUsers.getByDocumentId.fetch({ documentId: document.id })
      let documentUser = documentsUsers.find(du => du.userId === campaignUser.userId)

      documentUser ??= await createDocumentsUser({
        documentId: document.id,
        userId: campaignUser.userId,
        status: DocumentsUsersStatusEnum.PENDING,
      })

      if (!documentUser) throw new Error("Document user not found")

      // Collect all parent emails — mapping table is source of truth.
      // Exclude inactive/deleted parents.
      const isActiveOrPending = (status: string | null | undefined) =>
        status === UsersStatusEnum.ACTIVE || status === UsersStatusEnum.PENDING

      const allParentEmails = new Set<string>()
      const mappings = campaignUser.parentMappings ?? []

      // Legacy parent (if present)
      const legacy = campaignUser?.user?.parentUser
      if (legacy?.email && isActiveOrPending(legacy.status)) allParentEmails.add(legacy.email)

      // All mapping parents
      for (const mapping of mappings) {
        if (mapping.parentUser?.email && isActiveOrPending(mapping.parentUser.status)) {
          allParentEmails.add(mapping.parentUser.email)
        }
      }

      if (allParentEmails.size === 0) throw new Error("Participant's parent was not found")

      const organization = await utils.organizations.getById.fetch({ id: document.organizationId })

      const fromName = organization?.name ?? APP_NAME

      const response = await fetch("/api/email/send/document", {
        method: "POST",
        body: JSON.stringify({
          emailAddresses: [...allParentEmails],
          fromName,
          organizationName: organization?.name ?? "",
        }),
      })

      if (!response.ok) throw new Error("Failed to send document to parent")

      await updateDocumentsUser({
        id: documentUser.id,
        sentEmailAt: new Date(),
      })

      await utils.documents.listByCampaignId.invalidate({ campaignId: document.campaignId })

      toast.success(`Document sent to ${[...allParentEmails].join(", ")}`)

      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send document to parent")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        void handleSendEmail()
      }}
      title="Send document via email"
      description="This will send an email to the parent with a link to sign the document."
      confirmText={isPending ? "Sending..." : "Send"}
      isPending={isPending}
    />
  )
}
