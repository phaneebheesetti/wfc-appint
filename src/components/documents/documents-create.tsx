import { FileText } from "lucide-react"

import { Modal } from "@/components/ui/modal"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { api } from "@/trpc/react"

import { DocumentsForm } from "./documents-form"

interface DocumentsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
}

export function DocumentsCreate({ open, onOpenChange, campaignId, organizationId }: DocumentsCreateProps) {
  const utils = api.useUtils()

  const { data: campaignsUsers } = api.campaignsUsers.listByCampaignId.useQuery({ campaignId })

  const { mutateAsync: createManyDocumentsUsers } = api.documentsUsers.createMany.useMutation()

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Permission Slip"
      description="Upload a new permission slip to share with fundraiser participants"
      icon={FileText}
      iconClassName="text-blue-500"
    >
      <DocumentsForm
        campaignId={campaignId}
        organizationId={organizationId}
        onCreate={async document => {
          onOpenChange(false)

          const usersIds = campaignsUsers?.map(campaignUser => campaignUser.userId).filter(userId => !!userId) ?? []

          const documentsUsersToCreate = usersIds?.map(userId => ({
            documentId: document.id,
            userId,
            status: DocumentsUsersStatusEnum.PENDING,
          }))

          if (documentsUsersToCreate.length > 0) {
            await createManyDocumentsUsers(documentsUsersToCreate)
          }

          void utils.documents.listByCampaignId.invalidate()
        }}
      />
    </Modal>
  )
}
