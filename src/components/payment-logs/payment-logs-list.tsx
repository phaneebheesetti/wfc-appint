"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { FileDown, FileSpreadsheet, FileText, ReceiptText } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { COLOR_MAP } from "@/constants/colors"
import {
  PAYMENT_LOGS_STATUS_LABEL,
  PAYMENT_LOGS_TYPE_DETAILS,
  type PaymentLogsStatusEnum,
  PaymentLogsTypeEnum,
} from "@/constants/payment-logs"
import { useLoggedInUser } from "@/hooks"
import { useDataTableQueryStates } from "@/hooks"
import { type PaymentLog } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { formatCentsToCurrency } from "@/utils/money"
import { firstLetterUpperCase } from "@/utils/string"
import { maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

import { AlertDialogConfirm } from "../ui/alert-dialog"
import { PaymentLogsActions } from "./payment-logs-actions"

interface PaymentLogsListProps {
  campaignId: string
  organizationId: string
  campaignIsActive: boolean
}

export function PaymentLogsList({ campaignId, campaignIsActive }: PaymentLogsListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const { queryFilters, querySearch } = useDataTableQueryStates({
    id: "payment-logs-list-",
  })
  const { data, isLoading } = api.paymentLogs.listByCampaignId.useQuery({ campaignId })
  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId })
  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.paymentLogs.downloadReportByCampaignId.useMutation()
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const [selectedPaymentLog, setSelectedPaymentLog] = useState<PaymentLog | null>(null)
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
    await downloadPaymentLogsReport(type)
  }

  const downloadPaymentLogsReport = async (type: FileReportType) => {
    const fileName = `transactions-report-${campaign?.name ?? ""}`

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const data = await downloadReport({
      campaignId,
      timezone,
      type: queryFilters?.type as string[] | undefined,
      participantSearch: querySearch || undefined,
    })

    await downloadFileReport({
      type,
      fileName,
      data,
      sheetName: "Transactions Report",
    })
  }

  const columns: ColumnDef<PaymentLog>[] = [
    {
      accessorKey: "createdAt",
      header: props => <DataTableColumnHeader {...props} title="Date" />,
      cell: props => <DataTableCell {...props} type="datetime" />,
    },
    {
      accessorKey: "type",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Type"
          facetedFilter={{
            type: "single",
            accessorKey: "type",
            options: Object.values(PaymentLogsTypeEnum).map(type => ({
              label: `${firstLetterUpperCase(type)} Payment`,
              value: type,
            })),
          }}
        />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        if (!type) return null

        const { icon: Icon, label, color } = PAYMENT_LOGS_TYPE_DETAILS[type as PaymentLogsTypeEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={cn("flex items-center gap-2", colorClasses.text)}>
            <Icon size={16} /> <div>{label}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "user.pin",
      sortingFn: "basic",
      header: props => <DataTableColumnHeader {...props} title="PIN" />,
    },
    {
      accessorKey: "user.fullName",
      header: props => <DataTableColumnHeader {...props} title="Participant" />,
      cell: props => {
        const u = props.row.original.user
        const displayUser =
          u && shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false) ? maskParticipantUserPii(u) : u
        return <DataTableCell {...props} value={displayUser} type="nameAndEmail" />
      },
    },
    {
      accessorKey: "quantity",
      header: props => <DataTableColumnHeader {...props} title="Amount" />,
      cell: ({ row }) => <>{formatCentsToCurrency(row.original.amountCents ?? 0)}</>,
    },
    {
      accessorKey: "status",
      header: props => <DataTableColumnHeader {...props} title="Status" />,
      cell: ({ row }) => <>{PAYMENT_LOGS_STATUS_LABEL[row.original.status as PaymentLogsStatusEnum] ?? "-"}</>,
    },
    {
      accessorKey: "createdByUser.fullName",
      header: props => <DataTableColumnHeader {...props} title="Created By" />,
      cell: props => {
        const createdByUser = props.row.original.createdByUser
        const isCash = props.row.original.type === PaymentLogsTypeEnum.CASH
        const displayCreatedByUser =
          createdByUser && !isCash && shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
            ? maskParticipantUserPii(createdByUser)
            : createdByUser
        return <DataTableCell {...props} value={displayCreatedByUser} type="nameAndEmail" />
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedPaymentLog(row.original)} />,
    },
  ]

  const filteredData =
    data?.filter(paymentLog => {
      const matchesType = !queryFilters?.type?.length || queryFilters.type.includes(paymentLog.type)

      const participantName = paymentLog.user?.fullName?.toLowerCase() ?? ""

      const matchesSearch = !querySearch || participantName.includes(querySearch.toLowerCase())

      return matchesType && matchesSearch
    }) ?? []

  return (
    <>
      <DataTable
        id="payment-logs-list-"
        data={data ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Financial Transactions",
          description:
            "Transactions get logged here as money comes in to accurately track payments, balances, and overall fundraiser progress.",
          icon: ReceiptText,
          searchTitle: "No Transactions",
        }}
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [{ accessorKey: "user.fullName", name: "Participant" }],
        }}
        additionalButtons={[
          {
            text: isDownloadingReport ? "Downloading Report..." : "Download Report",
            variant: "secondary",
            onClick: () => void 0,
            icon: FileDown,
            disabled: isDownloadingReport || filteredData.length === 0,
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

      {selectedPaymentLog && (
        <PaymentLogsActions
          paymentLog={selectedPaymentLog}
          open={!!selectedPaymentLog}
          onOpenChange={() => setSelectedPaymentLog(null)}
          campaignIsActive={campaignIsActive}
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
          title="Download Tranactions Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Tranactions Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadPaymentLogsReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
