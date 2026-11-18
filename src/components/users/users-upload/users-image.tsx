import { CircleCheck, Image as ImageIcon, Trash, ZoomIn } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { type FileWithPreview } from "@/components/file-upload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { WithTooltip } from "@/components/ui/tooltip"
import { useParticipantsUploadStore } from "@/stores"
import { cn } from "@/utils/cn"

interface UsersImageProps {
  file: FileWithPreview
  isSelected: boolean
  hasError: boolean
  setSelectedFileId: (fileId: string) => void
}

export function UsersImage({ file, isSelected, hasError, setSelectedFileId }: UsersImageProps) {
  const [open, setOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const { files, setFiles, participantsByFileId, setParticipantsByFileId } = useParticipantsUploadStore(state => ({
    files: state.files,
    setFiles: state.setFiles,
    participantsByFileId: state.participantsByFileId,
    setParticipantsByFileId: state.setParticipantsByFileId,
  }))

  const handleRemove = () => {
    const newFiles = files.filter(f => f.id !== file.id)
    setFiles(newFiles)

    const newParticipantsByFileId = { ...participantsByFileId }
    delete newParticipantsByFileId[file.id]
    setParticipantsByFileId(newParticipantsByFileId)

    setSelectedFileId(newFiles[0]?.id ?? "")
  }

  if (!file?.preview) return null

  return (
    <>
      <div
        key={file.id}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          "relative flex flex-col gap-2 h-48 rounded-xl border border-chart-2 overflow-hidden",
          isSelected ? "border-primary border-2" : "cursor-pointer"
        )}
        onClick={() => setSelectedFileId(file.id)}
      >
        <Image src={file.preview} alt={file.file.name} className="object-cover" fill />

        {isHovering && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2">
            <WithTooltip
              content="Zoom in"
              side="top"
              trigger={
                <Button
                  size="icon"
                  onClick={e => {
                    e.stopPropagation()
                    setOpen(true)
                  }}
                >
                  <ZoomIn />
                </Button>
              }
            />
            <WithTooltip
              content="Remove"
              side="top"
              trigger={
                <Button
                  size="icon"
                  onClick={e => {
                    e.stopPropagation()
                    handleRemove()
                  }}
                >
                  <Trash />
                </Button>
              }
            />
          </div>
        )}

        {hasError ? (
          <Badge variant="error" className="absolute bottom-4 left-4 hover:bg-red-200">
            Fix Issues
          </Badge>
        ) : (
          <CircleCheck className="absolute bottom-4 left-4 text-green-500" />
        )}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Image Preview"
        className="max-w-[90vw]"
        icon={ImageIcon}
        iconClassName="text-green-500"
      >
        <Image src={file.preview} alt={file.file.name} fill />
      </Modal>
    </>
  )
}
