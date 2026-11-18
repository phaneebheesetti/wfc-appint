"use client"

import { Calendar, FileDown, FileSpreadsheet, FileText, Gift } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { GRADE_LABEL, IS_LABEL_CHANGE_ENABLED, TEACHER_LABEL } from "@/constants/participant-labels"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { type EventReportRow, formatEventReportForExport } from "@/utils/events"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { type PrizeReportRow, formatPrizeReportForExport } from "@/utils/prizes"
import { ENCRYPTED_STRING } from "@/utils/string"
import { shouldMaskParticipantPii } from "@/utils/users"

import { AlertDialogConfirm } from "../ui/alert-dialog"

interface CampaignsPrizesEventsParticipantsListProps {
  eligibleUsers: PrizeReportRow[] | EventReportRow[]
  prizeOrEventName: string
  isLoading?: boolean
  type: "prize" | "event"
  campaignId: string
}

export function CampaignsPrizesEventsParticipantsList({
  eligibleUsers,
  prizeOrEventName,
  isLoading,
  type,
  campaignId,
}: CampaignsPrizesEventsParticipantsListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const displayRows = useMemo(() => {
    const mask = shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
    if (!mask) return eligibleUsers

    return eligibleUsers.map(row => ({
      ...row,
      participant: ENCRYPTED_STRING,
    }))
  }, [eligibleUsers, role])
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()
  const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
    [FileReportType.CSV]: "CSV",
    [FileReportType.EXCEL]: "EXCEL",
  }
  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadReport(type)
  }

  const downloadReport = async (reportType: FileReportType) => {
    const fileName = `${type === "prize" ? "prize" : "event"}-report-${prizeOrEventName}-participants`

    const data = displayRows
    const dataForExport =
      type === "prize"
        ? formatPrizeReportForExport({ data: data as PrizeReportRow[] })
        : formatEventReportForExport({ data: data as EventReportRow[] })

    await downloadFileReport({
      type: reportType,
      fileName,
      data: dataForExport as unknown as Record<string, string | number>[],
      sheetName: type === "prize" ? "Prizes Report" : "Events Report",
    })
  }

  return (
    <>
      <DataTable
        data={displayRows as PrizeReportRow[]}
        loading={isLoading}
        initialPageSize={50}
        columns={[
          {
            accessorKey: "grade",
            ...(IS_LABEL_CHANGE_ENABLED ? { size: 100 } : {}),
            header: ({ column }) => <DataTableColumnHeader column={column} title={GRADE_LABEL} />,
          },
          {
            accessorKey: "teacher",
            ...(IS_LABEL_CHANGE_ENABLED ? { size: 120 } : {}),
            header: ({ column }) => <DataTableColumnHeader column={column} title={TEACHER_LABEL} />,
          },
          {
            accessorKey: "pin",
            sortingFn: "basic",
            header: ({ column }) => <DataTableColumnHeader column={column} title="PIN" />,
          },
          {
            accessorKey: "participant",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Participant" />,
          },
          {
            accessorKey: "casesCheckedOut",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Cases Checked Out" />,
          },
          {
            accessorKey: "amountDue",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Due ($)" />,
          },
          {
            accessorKey: "amountPaid",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Collected ($)" />,
          },
          {
            accessorKey: "amountUnpaid",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Unpaid ($)" />,
          },
        ]}
        emptyState={{
          title: "No participants found",
          description: `There are no participants eligible for this ${type} yet`,
          icon: type === "prize" ? Gift : Calendar,
        }}
        multiColumnFilter={{
          columns: [{ accessorKey: "participant", name: "Name" }],
        }}
        hideSearch={true}
        additionalButtons={[
          {
            text: isLoading ? "Generating Report..." : "Download Report",
            variant: "secondary",
            onClick: () => void 0,
            icon: FileDown,
            disabled: isLoading,
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
        ]}
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
          title="Download Prizes & Events Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Prizes & Events Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
