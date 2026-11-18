"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Ellipsis, ExternalLink, FileCheck, FileDown, FileSpreadsheet, FileText, Mails } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"
import { COLOR_MAP } from "@/constants/colors"
import { DOCUMENTS_DETAILS, type DocumentsTypeEnum } from "@/constants/documents"
import { DocumentsPermissionsEnum } from "@/constants/permissions"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type Document } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores/permissions-store"
import { api } from "@/trpc/react"
import { FileReportType, downloadFileReport } from "@/utils/files"

import { AlertDialogConfirm } from "../ui/alert-dialog"
import { DocumentsActions } from "./documents-actions"
import { DocumentsCreate } from "./documents-create"
import { DocumentsSendEmails } from "./documents-send-emails"

const REPORT_ALLOWED_ROLES: ReadonlyArray<RolesEnum> = [
  RolesEnum.WFC_ADMIN,
  RolesEnum.SALES_REPRESENTATIVE,
  RolesEnum.ORGANIZATION_ADMIN,
  RolesEnum.ORGANIZATION_STAFF,
]

interface DocumentsListProps {
  campaignId: string
  organizationId: string
}

export function DocumentsList({ campaignId, organizationId }: DocumentsListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)

  const [createDocument, setCreateDocument] = useState<boolean>(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [sendEmailDocument, setSendEmailDocument] = useState<Document | null>(null)
  const [sendEmailDocumentAlreadySent, setSendEmailDocumentAlreadySent] = useState<boolean>(false)
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)
  const { data, isLoading } = api.documents.listByCampaignId.useQuery({ campaignId })
  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId })
  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.documentsUsers.downloadReportByCampaignId.useMutation()

  if (!role) return null
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()
  const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
    [FileReportType.CSV]: "CSV",
    [FileReportType.EXCEL]: "EXCEL",
  }
  const { canCreate } = getResourcePermissions(role, DocumentsPermissionsEnum)
  const canDownloadReport = REPORT_ALLOWED_ROLES.includes(role)
  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadPermissionSlipsReport(type)
  }
  const downloadPermissionSlipsReport = async (type: FileReportType) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const reportData = await downloadReport({ campaignId, timezone })
    await downloadFileReport({
      type,
      fileName: `${campaign?.name ?? campaignId}-permission-slips-report`,
      data: reportData,
      sheetName: "Permission Slips Report",
      includeDate: false,
    })
  }

  const columns: ColumnDef<Document>[] = [
    {
      id: "view",
      header: ({ column }) => <DataTableColumnHeader column={column} title="File" />,
      cell: ({ row }) => (
        <Button variant="secondary" onClick={() => window.open(row.original.fileUrl, "_blank")}>
          <ExternalLink /> View
        </Button>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const type = row.original.type

        const { label, icon: Icon, color } = DOCUMENTS_DETAILS[type as DocumentsTypeEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={`flex items-center gap-1 ${colorClasses.text}`}>
            <Icon />
            {label}
          </div>
        )
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    },
    {
      id: "documentsUsersSigned",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Signed by" />,
      cell: props => {
        const documentsUsers = props.row.original.documentsUsers

        const totalUsers = documentsUsers?.length ?? 0
        const totalSigned = documentsUsers?.filter(user => user.signedAt).length ?? 0

        const progress = totalUsers > 0 ? (totalSigned / totalUsers) * 100 : 0

        return (
          <DataTableCell
            {...props}
            type="progress"
            progress={progress}
            value={
              <div className={"flex items-center gap-1"}>
                {totalSigned}
                <span className="text-[10px] text-muted-foreground"> / {totalUsers} participants</span>
              </div>
            }
          />
        )
      },
    },
    {
      id: "documentsUsersSent",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sent to" />,
      cell: props => {
        const documentsUsers = props.row.original.documentsUsers

        const totalUsers = documentsUsers?.length ?? 0
        const totalSent = documentsUsers?.filter(user => user.sentEmailAt).length ?? 0

        const progress = totalUsers > 0 ? (totalSent / totalUsers) * 100 : 0

        return (
          <DataTableCell
            {...props}
            type="progress"
            progress={progress}
            value={
              <div className={"flex items-center gap-1"}>
                {totalSent}
                <span className="text-[10px] text-muted-foreground"> / {totalUsers} participants</span>
              </div>
            }
          />
        )
      },
    },
    {
      id: "actions",
      header: props => <DataTableColumnHeader {...props} title="Actions" className="flex justify-end" />,
      cell: props => {
        const documentsUsers = props.row.original.documentsUsers

        const totalSent = documentsUsers?.filter(user => user.sentEmailAt).length ?? 0

        return (
          <div className="flex justify-end gap-1">
            <WithTooltip
              content={totalSent > 0 ? "Send to new parents" : "Send to parents"}
              side="top"
              trigger={
                <Button
                  variant="ghost"
                  className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                  size="icon"
                  onClick={() => {
                    setSendEmailDocument(props.row.original)
                    setSendEmailDocumentAlreadySent(totalSent > 0)
                  }}
                >
                  <Mails />
                </Button>
              }
            />

            <WithTooltip
              content="View Details"
              side="top"
              trigger={
                <Button
                  variant="ghost"
                  className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
                  size="icon"
                  onClick={() => {
                    setSelectedDocument(props.row.original)
                  }}
                >
                  <Ellipsis />
                </Button>
              }
            />
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        id="documents-list-"
        data={data ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Go Paperless With A Digital Permission Slip",
          description:
            "No chasing papers, no filing headaches – create a digital permission slip\nthat's easy for families to complete in just one click.",
          icon: FileCheck,
          proTip: "Get permission early (if applicable) for a smooth kick-off!",
          searchTitle: "No Permission Slips",
          buttonText: "Create Permission Slip",
        }}
        newButton={
          canCreate
            ? {
                text: "Create Permission Slip",
                onClick: () => setCreateDocument(true),
              }
            : undefined
        }
        additionalButtons={
          canDownloadReport
            ? [
                {
                  text: isDownloadingReport ? "Downloading Report..." : "Download Report",
                  variant: "secondary",
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
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [{ accessorKey: "name", name: "Name" }],
        }}
      />

      {createDocument && (
        <DocumentsCreate
          open={createDocument}
          onOpenChange={() => setCreateDocument(false)}
          campaignId={campaignId}
          organizationId={organizationId}
        />
      )}

      {selectedDocument && (
        <DocumentsActions
          document={selectedDocument}
          open={!!selectedDocument}
          onOpenChange={() => setSelectedDocument(null)}
        />
      )}

      {sendEmailDocument && (
        <DocumentsSendEmails
          document={sendEmailDocument}
          alreadySent={sendEmailDocumentAlreadySent}
          open={!!sendEmailDocument}
          onOpenChange={() => setSendEmailDocument(null)}
        />
      )}

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
            await downloadPermissionSlipsReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
