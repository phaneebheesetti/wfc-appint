import { Printer } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useReactToPrint } from "react-to-print"

import { FileUpload, type FileWithPreview } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { PrintComponent } from "@/components/ui/print-component"
import { Progress } from "@/components/ui/progress"
import { processImageBlackWhite } from "@/lib/jimp"
import { type ParticipantRow, useParticipantsUploadStore } from "@/stores"
import {
  type HandwritingOCRDownloadResponse,
  type HandwritingOCRUploadResponse,
  type Table,
} from "@/types/handwriting-ocr"
import { firstLetterLowerCase, firstLetterUpperCase } from "@/utils/string"

interface OrganizationsParticipantsUploadImageProps {
  organizationId: string
  campaignId?: string
}

export function OrganizationsParticipantsUploadImage({
  organizationId,
  campaignId,
}: OrganizationsParticipantsUploadImageProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [processedFilesCount, setProcessedFilesCount] = useState(0)

  const { files, setFiles, participantsByFileId, setParticipantsByFileId } = useParticipantsUploadStore(state => ({
    files: state.files,
    setFiles: state.setFiles,
    participantsByFileId: state.participantsByFileId,
    setParticipantsByFileId: state.setParticipantsByFileId,
  }))

  const contentRef = useRef<HTMLDivElement>(null)
  const reactToPrintFn = useReactToPrint({
    contentRef,
    pageStyle: "@page { size: 279mm 216mm; margin: 0; padding: 0; }",
  })

  useEffect(() => {
    const filesIds = files.map(file => file.id)
    if (filesIds.length === 0) return

    const allFilesHaveParticipants = filesIds.every(fileId => participantsByFileId[fileId])
    if (!allFilesHaveParticipants) return

    if (campaignId) {
      return router.push(`/dashboard/organizations/${organizationId}/campaigns/${campaignId}/upload-ocr`)
    } else {
      return router.push(`/dashboard/organizations/${organizationId}/upload-ocr`)
    }
  }, [files, participantsByFileId])

  const handleUpload = async () => {
    try {
      setUploading(true)

      const processedFiles = await Promise.all(files.map(preprocessImage))
      const uploadedFiles = await Promise.all(processedFiles.map(uploadImageData))
      setFiles(uploadedFiles)

      // Process all files in parallel
      const results = await Promise.all(
        uploadedFiles.map(async file => {
          let downloadedData: HandwritingOCRDownloadResponse | null = null
          let attempts = 0
          const maxAttempts = 10
          const delay = 5000

          while (attempts < maxAttempts) {
            downloadedData = await downloadImageData(file)

            if (downloadedData?.status === "processed") {
              break
            }

            attempts++
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, delay))
            }
          }

          if (!downloadedData || downloadedData.status !== "processed") {
            return
          }

          const parsedData = parseDownloadedData(downloadedData)

          setProcessedFilesCount(oldProcessedFilesCount => oldProcessedFilesCount + 1)

          return { fileId: file.id, participants: parsedData }
        })
      )
      const filteredResults = results.filter(result => result !== undefined)

      const newParticipantsByFileId = filteredResults.reduce(
        (acc, { fileId, participants }) => ({
          ...acc,
          [fileId]: participants,
        }),
        {} as Record<string, ParticipantRow[]>
      )

      setParticipantsByFileId(newParticipantsByFileId)
    } catch (_error) {
      setUploading(false)
    }
  }

  const preprocessImage = async (originalFile: FileWithPreview) => {
    const arrayBuffer = await originalFile.file.arrayBuffer()

    const { objectUrl } = await processImageBlackWhite(arrayBuffer)

    return { ...originalFile, preview: objectUrl }
  }

  const uploadImageData = async (originalFile: FileWithPreview) => {
    const formData = new FormData()
    formData.append("file", originalFile.file)

    const response = await fetch("/api/handwriting-ocr/upload-document", {
      method: "POST",
      body: formData,
    })
    const json = (await response.json()) as { data: HandwritingOCRUploadResponse }

    return { ...originalFile, id: json.data.id }
  }

  const downloadImageData = async (originalFile: FileWithPreview) => {
    const response = await fetch("/api/handwriting-ocr/download-document", {
      method: "POST",
      body: JSON.stringify({ id: originalFile.id }),
    })
    const json = (await response.json()) as { data: HandwritingOCRDownloadResponse }

    return json.data
  }

  const parseDownloadedData = (data: HandwritingOCRDownloadResponse): ParticipantRow[] => {
    const participantRows: ParticipantRow[] = []

    const { results } = data
    const tables = results.flatMap(result => result.tables)

    for (const table of tables) {
      participantRows.push(...parseTableData(table))
    }

    return participantRows
  }

  const parseTableData = (table: Table): ParticipantRow[] => {
    const participantRows: ParticipantRow[] = []

    const filteredRows = table.rows.filter(row => row.cells.some(cell => cell.content))

    const [headerRow, ...dataRows] = filteredRows

    const headerRowCells = (headerRow?.cells ?? []).map(cell => {
      const contentSplits = cell.content.split(" ")
      const content = contentSplits
        .map(split => firstLetterUpperCase(split.toLowerCase()))
        .join("")
        .trim()

      return firstLetterLowerCase(content)
    })

    dataRows.forEach(row => {
      const participantRow = headerRowCells.reduce(
        (acc, headerCell, index) => ({
          ...acc,
          [headerCell]: firstLetterUpperCase((row.cells[index]?.content ?? "").toLowerCase()).trim(),
        }),
        {} as ParticipantRow
      )

      participantRows.push(participantRow)
    })

    return participantRows
  }

  return (
    <div className="flex flex-col gap-4">
      {uploading ? (
        <div
          className={
            "flex flex-col gap-2 text-center bg-blue-100 items-center justify-center text-sm w-full border border-dashed rounded-lg bg-blue-500/15 border-blue-500/50 p-6"
          }
        >
          <Progress
            value={processedFilesCount === 0 ? 5 : (processedFilesCount / files.length) * 100}
            className="h-2 [&>*]:bg-blue-600 bg-blue-200"
          />
          Processing file{files.length > 1 ? "s" : ""}, hang in there!
          {files.length > 1 && (
            <span className="text-xs text-muted-foreground">
              {processedFilesCount}/{files.length}
            </span>
          )}
        </div>
      ) : (
        <FileUpload
          description="Accepted formats: .JPG, .JPEG, .PNG"
          fileTypes={["JPG", "JPEG", "PNG"]}
          onFilesChange={setFiles}
          multiple={true}
        />
      )}

      <div className="flex flex-col gap-1 text-sm bg-accent rounded-md px-3 py-2.5">
        <div className="font-medium">Tips for Best Results</div>

        <ul className="list-disc list-inside pl-2">
          <li>Make sure your image is clear, well-lit, and taken from a straight angle.</li>
          <li>Use all capital letters and print neatly for better accuracy.</li>
        </ul>

        <Button variant="outline" size="sm" className="mt-2 w-fit" type="button" onClick={() => reactToPrintFn()}>
          <Printer className="w-4 h-4" />
          Printable Template
        </Button>
      </div>

      <PrintComponent ref={contentRef}>
        <Image
          src="/download/participants-letter-template.png"
          alt="Participants Letter Template"
          width={3000}
          height={2318}
          unoptimized
        />
      </PrintComponent>

      <div>
        <Button disabled={files.length === 0 || uploading} onClick={handleUpload}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  )
}
