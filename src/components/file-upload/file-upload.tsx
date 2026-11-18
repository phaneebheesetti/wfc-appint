import { File, Upload, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { FileUploader } from "react-drag-drop-files"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/utils/cn"

const colorByStatus = {
  pending: "border-yellow-500 bg-yellow-500/10 text-yellow-500",
  uploaded: "border-green-500 bg-green-500/10 text-green-500",
  error: "border-red-500 bg-red-500/10 text-red-500",
}

type FileType = "JPG" | "JPEG" | "PNG" | "GIF" | "CSV" | "PDF"

type FileUploadStatus = "pending" | "uploaded" | "error"

export interface FileWithPreview {
  id: string
  file: File
  preview: string | null
  uploadStatus: FileUploadStatus
  uploadUrl: string | null
}

interface FileUploadProps {
  label?: string
  description?: string
  fileTypes: FileType[]
  required?: boolean
  multiple?: boolean
  onFilesChange?: (files: FileWithPreview[]) => void
  bucket?: {
    id: string
    folder?: string
  }
}

export const FileUpload = ({
  label,
  description,
  fileTypes,
  required = false,
  multiple = false,
  onFilesChange,
  bucket,
}: FileUploadProps) => {
  const [files, setFiles] = useState<FileWithPreview[]>([])

  useEffect(() => {
    onFilesChange?.(files)
  }, [files])

  const handleDragDropChange = (files: File | FileList) => {
    const filesArray = files instanceof FileList ? Array.from(files) : [files]

    const filePreviews = filesArray.map(file => {
      return {
        id: `${Date.now()}-${file.name}`.replaceAll(" ", "-"),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        uploadStatus: (bucket?.id ? "pending" : "uploaded") as FileUploadStatus,
        uploadUrl: null,
      }
    })

    setFiles(filePreviews)

    if (bucket?.id) {
      void Promise.all(filePreviews.map(handleUpload))
    }
  }

  const handleRemoveFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id)

    setFiles(updatedFiles)
  }

  const handleUpload = async (file: FileWithPreview) => {
    if (!bucket) return

    let url = null

    const supabase = createClient()

    const fileExtension = file.file.name.split(".").pop()
    const fileName = file.file.name.replaceAll(`.${fileExtension}`, "")
    const filePath = `${bucket?.folder ?? ""}${Date.now()}-${fileName}.${fileExtension}`

    const { data, error } = await supabase.storage.from(bucket.id).upload(filePath, file.file, { upsert: false })

    if (error) {
      toast.error("Failed to upload file")
    } else {
      const { data: publicUrlData } = supabase.storage.from(bucket.id).getPublicUrl(data.path)
      url = publicUrlData.publicUrl
    }

    setFiles(prevFiles =>
      prevFiles.map(prevFile =>
        prevFile.id === file.id ? { ...prevFile, uploadStatus: url ? "uploaded" : "error", uploadUrl: url } : prevFile
      )
    )
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-sm font-medium mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
      )}

      <div
        className={cn(
          "flex text-center bg-blue-100 items-center justify-center text-sm w-full border border-dashed rounded-lg bg-blue-500/15 border-blue-500/50",
          files.length === 0 && "hover:bg-blue-500/10 cursor-pointer"
        )}
      >
        {files.length > 0 ? (
          <div
            className={cn(
              "mb-2 flex items-center justify-center flex-wrap gap-2 p-4 h-[190px]",
              files.length === 0 && "hidden"
            )}
          >
            {files.map(({ id, file, preview, uploadStatus }) => (
              <div key={id} className="relative w-16 h-16 cursor-auto">
                <div
                  className={cn(
                    "flex items-center justify-center w-full h-full overflow-hidden rounded-xl border border-gray-500 bg-gray-500/10 text-gray-500",
                    colorByStatus[uploadStatus]
                  )}
                >
                  {preview ? (
                    <Image src={preview} alt={`Preview of ${file.name}`} fill className="object-cover" />
                  ) : (
                    <File className="w-8 h-8" />
                  )}
                </div>

                <WithTooltip
                  content="Remove file"
                  side="top"
                  trigger={
                    <Button
                      onClick={() => handleRemoveFile(id)}
                      variant="destructive"
                      className="absolute -top-2 -right-2 size-6 p-0 rounded-full bg-accent-foreground cursor-pointer"
                    >
                      <X />
                    </Button>
                  }
                />

                <div className="text-xs text-center w-16 truncate" title={file.name}>
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FileUploader
            handleChange={handleDragDropChange as (arg0: File | File[]) => void}
            name="files"
            types={fileTypes}
            multiple={multiple}
            onTypeError={(err: string) => toast.error(`File type error: ${err}`)}
            dropMessageStyle={{
              backgroundColor: "rgb(219 234 254)",
              borderColor: "rgb(191 219 254)",
              color: "#020817",
              opacity: 1,
              fontSize: "0.875rem",
              lineHeight: "1.25rem",
            }}
            hoverTitle="Drop files here"
            classes="w-full"
          >
            <div className="flex flex-col justify-center gap-2 p-4 h-[200px]">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Upload className="w-4 h-4" />
                <div>Drag and drop your file(s), or click here to select</div>
              </div>
              {description && <div>{description}</div>}
            </div>
          </FileUploader>
        )}
      </div>
    </div>
  )
}
