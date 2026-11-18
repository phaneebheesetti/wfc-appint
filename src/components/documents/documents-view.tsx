import copy from "copy-to-clipboard"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldText } from "@/components/ui/text"
import { DOCUMENTS_DETAILS, type DocumentsTypeEnum } from "@/constants/documents"
import { useLoggedInUser } from "@/hooks"
import { type Document } from "@/server/db/schema"
import { getUserDisplayName } from "@/utils/users"

interface DocumentsViewProps {
  document: Document
}

export function DocumentsView({ document }: DocumentsViewProps) {
  const { loggedInRole: role } = useLoggedInUser()

  if (!role) {
    return null
  }

  const handleCopyFileUrl = () => {
    copy(document.fileUrl)
    toast.success("File URL copied to clipboard")
  }

  const handleOpenFileUrl = () => {
    window.open(document.fileUrl, "_blank")
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Document ID" value={document.id} adminOnly />
      <FieldText label="Description" value={document.description} />
      <FieldText label="Type" value={DOCUMENTS_DETAILS[document.type as DocumentsTypeEnum].label} />
      <FieldText
        label="File"
        value={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenFileUrl}>
              <ExternalLink className="w-4 h-4" />
              Open
            </Button>
            <Button variant="outline" onClick={handleCopyFileUrl}>
              <Copy className="w-4 h-4" />
              Copy URL
            </Button>
          </div>
        }
      />
      <FieldText
        label="Uploaded By"
        value={
          <>
            <div>{getUserDisplayName(document.uploadedByUser)}</div>
            <div className="text-xs text-muted-foreground">{document.uploadedByUser?.email ?? ""}</div>
          </>
        }
      />
    </div>
  )
}
