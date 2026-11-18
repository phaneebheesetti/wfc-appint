import { Info, Users } from "lucide-react"
import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { TabsSimple } from "@/components/ui/tabs/tabs-simple"
import { DocumentsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Document } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { DocumentsDelete } from "./documents-delete"
import { DocumentsForm } from "./documents-form"
import { DocumentsParticipantsList } from "./documents-participants-list"
import { DocumentsView } from "./documents-view"

interface DocumentsActionsProps {
  document: Document
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Actions = "view" | "update" | "delete"

export function DocumentsActions({ document, open, onOpenChange }: DocumentsActionsProps) {
  const utils = api.useUtils()

  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, DocumentsPermissionsEnum)

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={document.name} description="Document">
      {action === "update" && (
        <DocumentsForm
          document={document}
          organizationId={document.organizationId}
          campaignId={document.campaignId}
          onBack={() => setAction("view")}
          onUpdate={() => {
            onOpenChange(false)
            void utils.documents.listByCampaignId.invalidate()
          }}
        />
      )}

      {action !== "update" && (
        <TabsSimple
          defaultTab="document-info"
          tabs={[
            {
              label: "Information",
              value: "document-info",
              content: (
                <>
                  <DocumentsView document={document} />

                  <div className="flex gap-2 mt-4">
                    {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
                    {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
                  </div>
                </>
              ),
              icon: Info,
            },
            {
              label: "Participants",
              value: "document-participants",
              content: <DocumentsParticipantsList document={document} campaignId={document.campaignId} />,
              icon: Users,
            },
          ]}
        />
      )}

      <DocumentsDelete
        document={document}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)
          void utils.documents.listByCampaignId.invalidate()
        }}
      />
    </SheetSimple>
  )
}
