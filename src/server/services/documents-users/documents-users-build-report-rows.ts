import { formatInTimeZone } from "date-fns-tz"

import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { type Document, type DocumentUser } from "@/server/db/schema"
import { maskParticipantUserPii } from "@/utils/users"

type DocumentWithUsers = Document & {
  documentsUsers: DocumentUser[]
}

const DATE_FORMAT = "MM/dd/yyyy h:mma"

const EMPTY_ROW = {
  "Permission Slip Name": "",
  "Participant PIN": "",
  "Participant Name": "",
  "Parent / Signer Full Name": "",
  "Parent Email": "",
  "Parent Phone": "",
  Status: "",
  "Signed Digitally": "",
  "Signature Date & Time": "",
  "Admin Manually Marked": "",
  "Email Sent Date": "",
  Device: "",
  Browser: "",
  "Operating System": "",
  "Session ID": "",
  "User ID": "",
}

export const documentsUsersBuildReportRows = ({
  documents,
  timezone = "UTC",
  maskParticipantPii = false,
}: {
  documents: DocumentWithUsers[]
  timezone?: string
  maskParticipantPii?: boolean
}): Record<string, string>[] => {
  const rows: Record<string, string>[] = []

  for (const document of documents) {
    for (const documentUser of document.documentsUsers ?? []) {
      const isSigned = (documentUser.status as DocumentsUsersStatusEnum) === DocumentsUsersStatusEnum.SIGNED
      const metadata = (documentUser.metadata ?? null) as Record<string, string> | null

      const signedAt = documentUser.signedAt
      const sentAt = documentUser.sentEmailAt

      const participantUser =
        maskParticipantPii && documentUser.user ? maskParticipantUserPii(documentUser.user) : documentUser.user

      rows.push({
        "Permission Slip Name": document.name ?? "",
        "Participant PIN": participantUser?.pin ?? "",
        "Participant Name": participantUser?.fullName ?? "",
        "Parent / Signer Full Name": isSigned ? (metadata?.fullName ?? "") : "",
        "Parent Email": isSigned ? (metadata?.email ?? "") : "",
        "Parent Phone": isSigned ? (metadata?.phone ?? "") : "",
        Status: isSigned ? "Signed" : "Pending",
        "Signed Digitally": isSigned ? (metadata?.signedDigitally === "true" ? "Yes" : "No") : "",
        "Signature Date & Time": isSigned && signedAt ? formatInTimeZone(signedAt, timezone, DATE_FORMAT) : "",
        "Admin Manually Marked": isSigned ? (metadata?.signedDigitally === "false" ? "Yes" : "No") : "",
        "Email Sent Date": sentAt ? formatInTimeZone(sentAt, timezone, DATE_FORMAT) : "",
        Device: isSigned ? (metadata?.device ?? "") : "",
        Browser: isSigned ? (metadata?.browser ?? "") : "",
        "Operating System": isSigned ? (metadata?.operatingSystem ?? "") : "",
        "Session ID": isSigned ? (metadata?.sessionId ?? "") : "",
        "User ID": isSigned ? (metadata?.userId ?? "") : "",
      })
    }
  }

  rows.sort((a, b) => {
    const slip = (a["Permission Slip Name"] ?? "").localeCompare(b["Permission Slip Name"] ?? "")
    if (slip !== 0) return slip
    return (a["Participant Name"] ?? "").localeCompare(b["Participant Name"] ?? "")
  })

  return rows.length === 0 ? [EMPTY_ROW] : rows
}
