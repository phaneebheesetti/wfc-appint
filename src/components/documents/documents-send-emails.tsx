import { useState } from "react"
import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { APP_NAME } from "@/constants/app"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { UsersStatusEnum } from "@/constants/users"
import { type Document } from "@/server/db/schema"
import { TRPC_QUERY_ID_CHUNK_SIZE, api } from "@/trpc/react"
import { chunkArray } from "@/utils/array"

async function fetchParticipantIdsInChunks<T>(
  participantIds: string[],
  fetcher: (participantIds: string[]) => Promise<T[]>
): Promise<T[]> {
  const results = await Promise.all(chunkArray(participantIds, TRPC_QUERY_ID_CHUNK_SIZE).map(chunk => fetcher(chunk)))
  return results.flat()
}

interface DocumentsSendEmailsProps {
  document: Document
  alreadySent: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentsSendEmails({ document, alreadySent, open, onOpenChange }: DocumentsSendEmailsProps) {
  const utils = api.useUtils()
  const [isPending, setIsPending] = useState(false)

  const { mutateAsync: createManyDocumentsUsers } = api.documentsUsers.createMany.useMutation()
  const { mutateAsync: updateManyDocumentsUsers } = api.documentsUsers.updateMany.useMutation()

  const handleSendEmails = async () => {
    try {
      setIsPending(true)

      const campaignUsers = await utils.campaignsUsers.listByCampaignId.fetch({ campaignId: document.campaignId })
      const campaignUsersIds = campaignUsers.map(user => user.userId)

      const documentsUsers = await utils.documentsUsers.getByDocumentId.fetch({ documentId: document.id })
      const documentsUsersIds = documentsUsers.map(du => du.userId)

      const documentsUsersToCreate = campaignUsersIds
        .filter(id => !documentsUsersIds.includes(id))
        .map(userId => ({
          documentId: document.id,
          userId,
          status: DocumentsUsersStatusEnum.PENDING,
        }))

      if (documentsUsersToCreate.length > 0) {
        const createdDocumentsUsers = await createManyDocumentsUsers(documentsUsersToCreate)
        documentsUsers.push(...createdDocumentsUsers)
        documentsUsersIds.push(...createdDocumentsUsers.map(du => du.userId))
      }

      const documentUsersPendingEmail = documentsUsers.filter(du => !du.sentEmailAt)
      const usersIdsPendingEmail = documentUsersPendingEmail.map(du => du.userId)

      // Fetch all parent mappings for pending participants
      const allMappings = usersIdsPendingEmail.length
        ? await fetchParticipantIdsInChunks(usersIdsPendingEmail, ids =>
            utils.participantParentMapping.listByParticipantIds.fetch({
              participantUserIds: ids,
            })
          )
        : []

      const mappingsByParticipantId = new Map<string, typeof allMappings>()
      for (const mapping of allMappings) {
        if (!mappingsByParticipantId.has(mapping.participantUserId)) {
          mappingsByParticipantId.set(mapping.participantUserId, [])
        }
        mappingsByParticipantId.get(mapping.participantUserId)!.push(mapping)
      }

      // Collect all parent emails (legacy + mapping) per pending participant.
      // Exclude inactive/deleted parents.
      const isActiveOrPending = (status: string | null | undefined) =>
        status === UsersStatusEnum.ACTIVE || status === UsersStatusEnum.PENDING

      const allEmails = new Set<string>()
      const usersIdsWithAtLeastOneEmail: string[] = []

      for (const campaignUser of campaignUsers) {
        if (!usersIdsPendingEmail.includes(campaignUser.userId)) continue

        const mappings = mappingsByParticipantId.get(campaignUser.userId) ?? []
        const emailsForParticipant: string[] = []

        // Legacy parent (if present)
        const legacy = campaignUser.user?.parentUser
        if (legacy?.email && isActiveOrPending(legacy.status)) {
          emailsForParticipant.push(legacy.email)
        }

        // All mapping parents
        for (const mapping of mappings) {
          if (mapping.parentUser?.email && isActiveOrPending(mapping.parentUser.status)) {
            emailsForParticipant.push(mapping.parentUser.email)
          }
        }

        if (emailsForParticipant.length > 0) {
          usersIdsWithAtLeastOneEmail.push(campaignUser.userId)
          for (const email of emailsForParticipant) {
            const trimmed = email.trim().toLowerCase()
            if (trimmed) allEmails.add(trimmed)
          }
        }
      }

      const parentEmails = Array.from(allEmails)

      if (parentEmails.length === 0) {
        await utils.documents.listByCampaignId.invalidate({ campaignId: document.campaignId })
        toast.error("All parents have already received this email")
        onOpenChange(false)
        return
      }

      const organization = await utils.organizations.getById.fetch({ id: document.organizationId })

      const fromName = organization?.name ?? APP_NAME

      const response = await fetch("/api/email/send/document", {
        method: "POST",
        body: JSON.stringify({
          emailAddresses: parentEmails,
          fromName,
          organizationName: organization?.name ?? "",
        }),
      })
      if (!response.ok) {
        toast.error("Failed to send document to parents")
        onOpenChange(false)
        return
      }

      const documentsUsersToUpdate = documentUsersPendingEmail
        ?.filter(du => usersIdsWithAtLeastOneEmail.includes(du.userId))
        .map(du => ({
          id: du.id,
          sentEmailAt: new Date(),
        }))

      await updateManyDocumentsUsers(documentsUsersToUpdate)

      await utils.documents.listByCampaignId.invalidate({ campaignId: document.campaignId })

      toast.success(`Document sent to ${parentEmails.length} parent${parentEmails.length > 1 ? "s" : ""}`)

      onOpenChange(false)
    } catch (_error) {
      toast.error("Failed to send document to parents")
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
        void handleSendEmails()
      }}
      title={
        alreadySent
          ? "Send Permission Slip to new Participants/Parents"
          : "Send Permission Slip to all Participants/Parents"
      }
      description={
        alreadySent
          ? "Send all newly added parents in the participant list an e-mail with a link to the uploaded document. Parents who have already received this e-mail will not be included."
          : "Send all parents in the participant list an e-mail with a link to the uploaded document"
      }
      confirmText={isPending ? "Sending..." : "Send emails"}
      isPending={isPending}
    />
  )
}
