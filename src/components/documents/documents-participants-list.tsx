"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { FileDown, FileSpreadsheet, FileText, User } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type Document, type DocumentUser } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

import { AlertDialogConfirm } from "../ui/alert-dialog"

const REPORT_ALLOWED_ROLES: ReadonlyArray<RolesEnum> = [
  RolesEnum.WFC_ADMIN,
  RolesEnum.SALES_REPRESENTATIVE,
  RolesEnum.ORGANIZATION_ADMIN,
  RolesEnum.ORGANIZATION_STAFF,
]

interface DocumentsParticipantsListProps {
  document: Document
  campaignId: string
}

export function DocumentsParticipantsList({ document, campaignId }: DocumentsParticipantsListProps) {
  const { loggedInRole: role } = useLoggedInUser()

  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.documentsUsers.downloadReportByDocumentId.useMutation()
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const canDownloadReport = !!role && REPORT_ALLOWED_ROLES.includes(role)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)
  const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
    [FileReportType.CSV]: "CSV",
    [FileReportType.EXCEL]: "EXCEL",
  }
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()
  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadParticipantsReport(type)
  }
  const downloadParticipantsReport = async (type: FileReportType) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const data = await downloadReport({ documentId: document.id, timezone, campaignId })
    await downloadFileReport({
      type,
      fileName: `${document.name}-permission-slip-report`,
      data,
      sheetName: "Permission Slip Report",
      includeDate: false,
    })
  }

  const columns: ColumnDef<DocumentUser>[] = [
    {
      accessorKey: "user.pin",
      sortingFn: "basic",
      header: ({ column }) => <DataTableColumnHeader column={column} title="PIN" />,
    },
    {
      accessorKey: "user.fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Participant" />,
      cell: props => {
        const u = props.row.original.user
        const displayUser =
          u && shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false) ? maskParticipantUserPii(u) : u
        return <DataTableCell {...props} value={displayUser} type="nameAndEmail" />
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const documentUser = row.original

        return (
          <Badge
            variant={
              (documentUser.status as DocumentsUsersStatusEnum) === DocumentsUsersStatusEnum.SIGNED
                ? "success"
                : "error"
            }
          >
            {documentUser.status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "sentEmailAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sent Email At" />,
      cell: ({ row }) => {
        const sentAt = row.original.sentEmailAt

        return sentAt ? formatDate(sentAt) : "-"
      },
    },
  ]

  return (
    <>
      <DataTable
        data={document.documentsUsers ?? []}
        initialPageSize={50}
        emptyState={{
          title: "No participants found",
          icon: User,
        }}
        columns={columns}
        multiColumnFilter={{
          columns: [{ accessorKey: "user.fullName", name: "Name" }],
        }}
        additionalButtons={
          canDownloadReport
            ? [
                {
                  text: isDownloadingReport ? "Downloading Report..." : "Download Report",
                  onClick: () => void 0,
                  icon: FileDown,
                  disabled: isDownloadingReport,
                  buttons: [
                    {
                      text: "Excel File",
                      onClick: () => void onClickOfDownload(FileReportType.EXCEL),
                      icon: FileSpreadsheet,
                    },
                    {
                      text: "CSV File",
                      onClick: () => void onClickOfDownload(FileReportType.CSV),
                      icon: FileText,
                    },
                  ],
                },
              ]
            : undefined
        }
      />
      {participantAccessData?.isGranted && (
        <AlertDialogConfirm
          open={showDownloadConfirm}
          onOpenChange={open => {
            setShowDownloadConfirm(open)
            if (!open) {
              setSelectedReportType(null)
            }
          }}
          title="Download Permission Slips Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Permission Slips Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadParticipantsReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
