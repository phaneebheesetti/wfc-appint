"use client"

import { Box, FileDown, FileSpreadsheet, FileText } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { Modal } from "@/components/ui/modal"
import { useLoggedInUser } from "@/hooks"
import { type ChocolateRequestAlertUser } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { ENCRYPTED_STRING } from "@/utils/string"
import { shouldMaskParticipantPii } from "@/utils/users"

interface ChocolateRequestParticipantsModalProps {
  campaignId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
  [FileReportType.CSV]: "CSV",
  [FileReportType.EXCEL]: "EXCEL",
}

export function ChocolateRequestParticipantsModal({
  campaignId,
  open,
  onOpenChange,
}: ChocolateRequestParticipantsModalProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)

  const { data: participants = [], isLoading } = api.campaignsUsers.listChocolateRequestAlertsByCampaignId.useQuery(
    { campaignId },
    { enabled: open }
  )
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery(
    { campaignId },
    { enabled: open }
  )
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()

  const displayRows = useMemo(() => {
    const mask = shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
    if (!mask) return participants

    return participants.map(row => ({ ...row, fullName: ENCRYPTED_STRING }))
  }, [participants, role, participantAccessData?.isGranted])

  useEffect(() => {
    if (!open || !participantAccessData?.isGranted) return

    void createAccessLog({ campaignId, eventType: "VIEW_PARTICIPANT_NAMES" })
  }, [open, participantAccessData?.isGranted, campaignId, createAccessLog])

  const downloadReport = async (type: FileReportType) => {
    const data = displayRows.map(({ fullName, pin }) => ({ Name: fullName, PIN: pin }))

    await downloadFileReport({
      type,
      fileName: "requests-for-chocolate-participants",
      data,
      sheetName: "Requests for Chocolate",
    })
  }

  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadReport(type)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Requests for Chocolate" className="max-w-2xl">
      <DataTable
        data={displayRows as (ChocolateRequestAlertUser & { fullName: string })[]}
        loading={isLoading}
        initialPageSize={50}
        columns={[
          {
            accessorKey: "fullName",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
          },
          {
            accessorKey: "pin",
            header: ({ column }) => <DataTableColumnHeader column={column} title="PIN" />,
          },
        ]}
        emptyState={{
          title: "No pending chocolate requests",
          description: "No participants currently have an unfulfilled request for more chocolate.",
          icon: Box,
        }}
        multiColumnFilter={{
          columns: [
            { accessorKey: "fullName", name: "Name" },
            { accessorKey: "pin", name: "PIN" },
          ],
        }}
        hideSearch={displayRows.length === 0}
        additionalButtons={[
          {
            text: "Download Report",
            variant: "secondary",
            onClick: () => void 0,
            icon: FileDown,
            disabled: displayRows.length === 0,
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
          onOpenChange={openState => {
            setShowDownloadConfirm(openState)
            if (!openState) setSelectedReportType(null)
          }}
          title="Download Requests for Chocolate Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Requests for Chocolate Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </Modal>
  )
}
