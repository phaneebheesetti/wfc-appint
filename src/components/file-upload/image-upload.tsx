import { UploadCloud, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { FileUploader } from "react-drag-drop-files"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

interface ImageUploadProps {
  bucketName: string
  folderPath?: string
  onUploadComplete: (url: string) => void
  label?: string
  description?: string
  width?: number
  height?: number
  previewUrl?: string
  required?: boolean
}

export const ImageUpload = ({
  bucketName,
  folderPath = "",
  onUploadComplete,
  label,
  description,
  width = 240,
  height = 240,
  previewUrl,
  required = false,
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null)

  // Allowed image types (you can adjust as needed).
  const fileTypes = ["JPG", "PNG", "GIF", "JPEG"]

  // Called by the FileUploader upon file selection or drop
  const handleDragDropChange = (file: File) => {
    // Validate: only allow image files
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.")
      return
    }

    // Generate a local preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    // Immediately upload after selecting
    void handleUpload(file)
  }

  // Upload the file to Supabase
  const handleUpload = async (file: File) => {
    setIsUploading(true)

    try {
      const supabase = createClient()

      const fileExtension = file.name.split(".").pop()
      const filePath = `${folderPath}${Date.now()}.${fileExtension}`

      const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, { upsert: false })
      if (error) throw error

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)

      onUploadComplete(publicUrlData.publicUrl)
      toast.success("Image uploaded successfully.")
    } catch (_error) {
      toast.error("Failed to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  // Clear the preview from state
  const clearPreview = () => {
    setPreview(null)
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-sm font-medium mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
      )}

      {!preview ? (
        <FileUploader
          handleChange={handleDragDropChange as (arg0: File | File[]) => void}
          name="imageFile"
          types={fileTypes}
          multiple={false}
          label=""
          onTypeError={(err: string) => toast.error(`File type error: ${err}`)}
        >
          {/* This wrapper is the clickable/drag area */}
          <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 p-4">
            <UploadCloud className="w-8 h-8 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag &amp; drop
            </p>
            {/* Use the "description" prop or a default message */}
            <p className="text-xs text-gray-500 px-4 text-center">
              {description ?? "Only image files (jpg, png, gif) are accepted."}
            </p>
          </div>
        </FileUploader>
      ) : (
        // Show image preview
        <div className="relative w-full rounded-lg overflow-hidden" style={{ width, height }}>
          <Image src={preview} alt="Preview" className="object-contain" fill width={width} height={height} />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Show upload status */}
      {isUploading && <div className="mt-2 text-sm text-center text-gray-500">Uploading image...</div>}
    </div>
  )
}
