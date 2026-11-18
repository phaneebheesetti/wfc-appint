import { Download, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import Papa from "papaparse"
import { useState } from "react"
import { toast } from "sonner"

import { FileUpload, type FileWithPreview } from "@/components/file-upload"
import { AccordionSimple } from "@/components/ui/accordion-simple"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  CSV_GRADE_HEADER,
  CSV_TEACHER_HEADER,
  IS_LABEL_CHANGE_ENABLED,
  PARTICIPANTS_UPLOAD_TEMPLATE_PATH,
} from "@/constants/participant-labels"
import { useParticipantsUploadStore } from "@/stores"
import { sanitizeString } from "@/utils/string"

export interface ParticipantCSVRow {
  first_name: string
  last_name: string
  grade?: string
  teacher_name?: string
  grade_group?: string
  teacher_leader?: string
  participant_email?: string
  participant_phone?: string
  parent_email?: string
  parent_phone?: string
}

interface OrganizationsParticipantsUploadCSVProps {
  organizationId: string
  campaignId?: string
}

export function OrganizationsParticipantsUploadCSV({
  organizationId,
  campaignId,
}: OrganizationsParticipantsUploadCSVProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [totalParticipants, setTotalParticipants] = useState(0)
  const { participantsByFileId, setParticipantsByFileId, files, setFiles } = useParticipantsUploadStore(state => ({
    participantsByFileId: state.participantsByFileId,
    setParticipantsByFileId: state.setParticipantsByFileId,
    files: state.files,
    setFiles: state.setFiles,
  }))

  const handleUpload = async () => {
    try {
      setUploading(true)
      setParticipantsByFileId(participantsByFileId)

      if (campaignId) {
        return router.push(`/dashboard/organizations/${organizationId}/campaigns/${campaignId}/upload-csv`)
      } else {
        return router.push(`/dashboard/organizations/${organizationId}/upload-csv`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error uploading participants")
      setUploading(false)
    }
  }

  const handleFilesChange = (files: FileWithPreview[]) => {
    if (files.length === 0) {
      setFiles([])
      setValidationError("")
      setParticipantsByFileId({})
      setTotalParticipants(0)
      return
    }

    const file = files[0]
    if (!file) {
      setValidationError("Please upload a valid CSV file")
      return
    }

    setFiles([file])
    setValidationError("")

    Papa.parse(file.file, {
      complete: results => {
        const data = results.data as ParticipantCSVRow[]

        const expectedHeaders: string[][] = [
          ["first_name"],
          ["last_name"],
          IS_LABEL_CHANGE_ENABLED ? ["grade_group", "grade"] : ["grade"],
          IS_LABEL_CHANGE_ENABLED ? ["teacher_leader", "teacher_name"] : ["teacher_name"],
        ]
        const headers = Object.keys(data[0] ?? {})

        const missingHeaders = expectedHeaders
          .filter(acceptedNames => !acceptedNames.some(name => headers.includes(name)))
          .map(acceptedNames => acceptedNames[0])
        if (missingHeaders.length > 0) {
          setValidationError(`Missing required columns: ${missingHeaders.join(", ")}`)
          setParticipantsByFileId({})
          return
        }

        const filteredParticipants = data.filter(
          participant => "first_name" in participant && "last_name" in participant
        )

        setTotalParticipants(filteredParticipants.length)

        setParticipantsByFileId({
          [file.id]: filteredParticipants.map(participant => ({
            firstName: sanitizeString(participant.first_name) ?? "",
            lastName: sanitizeString(participant.last_name) ?? "",
            grade: sanitizeString(participant.grade_group ?? participant.grade) ?? "",
            teacherName: sanitizeString(participant.teacher_leader ?? participant.teacher_name) ?? "",
            // participantEmail: sanitizeString(participant.participant_email),
            // participantPhone: sanitizeString(participant.participant_phone),
            parentEmail: sanitizeString(participant.parent_email),
            // parentPhone: sanitizeString(participant.parent_phone),
          })),
        })
      },
      header: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <FileUpload
        description="Accepted formats: .csv"
        fileTypes={["CSV"]}
        onFilesChange={handleFilesChange}
        multiple={false}
      />

      {files.length > 0 && (
        <Alert variant={totalParticipants > 0 ? "success" : "destructive"}>
          <AlertDescription>
            {totalParticipants > 0 ? (
              <span>
                Found {totalParticipants} participant{totalParticipants > 1 ? "s" : ""}.
              </span>
            ) : (
              <span>No participants found.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 text-sm bg-accent rounded-md p-4">
        <div className="text-base font-medium">Create CSV with the following column headers:</div>
        <div>
          <strong>required:</strong> first_name, last_name, {CSV_GRADE_HEADER}, {CSV_TEACHER_HEADER}
        </div>
        <div>
          <strong>optional:</strong> parent_email
        </div>
        <a href={PARTICIPANTS_UPLOAD_TEMPLATE_PATH} download="participants-upload.csv">
          <Button variant="outline" size="sm" type="button">
            <Download className="w-4 h-4" />
            Download csv template
          </Button>
        </a>
      </div>

      <AccordionSimple
        type="single"
        items={[
          {
            title: "How to Generate a CSV File from Excel ",
            value: "instructions",
            content: (
              <div>
                <ul className="list-decimal list-inside">
                  <li>
                    <b>Open</b> your Excel file.
                  </li>
                  <li>
                    Click on <b>&quot;File&quot;</b> in the top menu.
                  </li>
                  <li>
                    Select <b>&quot;Save As&quot;</b> (or <b>&quot;Save a Copy&quot;</b> in newer versions of Excel).
                  </li>
                  <li>Choose a location to save the file.</li>
                  <li>
                    In the <b>&quot;Save as type&quot;</b> dropdown menu, select{" "}
                    <b>&quot;CSV (Comma delimited) (*.csv)&quot;</b>.
                  </li>
                  <li>
                    Click <b>&quot;Save&quot;</b>.
                  </li>
                  <li>
                    If a warning appears about compatibility issues, click <b>&quot;Yes&quot;</b> to continue.
                  </li>
                  <li>Your CSV file is ready to be uploaded now!</li>
                </ul>
              </div>
            ),
          },
        ]}
      />

      <div className="flex items-start gap-2 rounded-card border border-brown-200 bg-[#fdf8ee] px-4 py-3 text-sm text-brown-900">
        <Mail className="h-4 w-4 mt-[1px] shrink-0 text-brown-200" />
        <span>
          If a parent email is included in the file, the parent/guardian will receive a welcome email with login
          instructions when you click <b>Upload</b>.
        </span>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={
            uploading ||
            files.length === 0 ||
            Object.values(participantsByFileId).length === 0 ||
            totalParticipants === 0
          }
          onClick={handleUpload}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  )
}
