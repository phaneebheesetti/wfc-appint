"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Box, FileDown, FileSpreadsheet, FileText, Minus } from "lucide-react"
import { useState } from "react"

import { CampaignsSmallCards } from "@/components/campaigns"
import { DataTable, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { DataTableCell } from "@/components/data-table/data-table-cell"
import { CasesDeliveredForm, InventoryAdjustmentForm } from "@/components/tracking"
import {
  CASES_TRANSACTIONS_TYPE_DETAILS,
  CasesTransactionsTypeEnum,
  INVENTORY_ADJUSTMENT_TOOLTIP,
  INVENTORY_DISCLAIMER,
} from "@/constants/cases-transactions"
import { COLOR_MAP } from "@/constants/colors"
import { CasesTransactionsPermissionsEnum } from "@/constants/permissions"
import { env } from "@/env"
import { useDataTableQueryStates } from "@/hooks"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CasesTransaction } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores/permissions-store"
import { api } from "@/trpc/react"
import { getCaseName } from "@/utils/cases-transactions"
import { cn } from "@/utils/cn"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { firstLetterUpperCase } from "@/utils/string"
import { maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

import { AlertDialogConfirm } from "../ui/alert-dialog"
import { CasesTransactionsActions } from "./cases-transactions-actions"

interface CasesTransactionsListProps {
  campaignId: string
  organizationId: string
  campaignIsActive: boolean
}

export function CasesTransactionsList({ campaignId, organizationId, campaignIsActive }: CasesTransactionsListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { queryFilters } = useDataTableQueryStates({
    id: "cases-transactions-list-",
  })

  const [createTransaction, setCreateTransaction] = useState<boolean>(false)
  const [showAdjustmentForm, setShowAdjustmentForm] = useState<boolean>(false)
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const [selectedCasesTransaction, setSelectedCasesTransaction] = useState<CasesTransaction | null>(null)

  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data, isLoading } = api.casesTransactions.getByCampaignId.useQuery({ campaignId })
  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.casesTransactions.downloadReportByCampaignId.useMutation()
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)

  const onClickOfDownload = async (type: FileReportType) => {
    if (participantAccessData?.isGranted) {
      setSelectedReportType(type)
      setShowDownloadConfirm(true)
      return
    }
    await downloadCasesTransactionsReport(type)
  }
  if (!role) return null
  const { canCreate } = getResourcePermissions(role, CasesTransactionsPermissionsEnum)
  const downloadCasesTransactionsReport = async (type: FileReportType) => {
    const fileName = `cases-transactions-report-${campaign?.name ?? ""}`

    const startDate = queryFilters?.createdAt?.[0] ? new Date(queryFilters.createdAt?.[0] as string) : undefined
    const endDate = queryFilters?.createdAt?.[1] ? new Date(queryFilters.createdAt?.[1] as string) : undefined

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const data = await downloadReport({ campaignId, startDate, endDate, timezone })

    await downloadFileReport({ type, fileName, data, sheetName: "Cases Transactions Report" })
  }
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const fileTypeMap: Record<FileReportType, "CSV" | "EXCEL"> = {
    [FileReportType.CSV]: "CSV",
    [FileReportType.EXCEL]: "EXCEL",
  }
  const { mutateAsync: createAccessLog } = api.participantNamesAccess.logAccessEvent.useMutation()
  const columns: ColumnDef<CasesTransaction>[] = [
    {
      accessorKey: "createdAt",
      filterFn: "dateBetween",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Date"
          facetedFilter={{
            type: "date",
            accessorKey: "createdAt",
          }}
        />
      ),
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
            options: Object.values(CasesTransactionsTypeEnum)
              .filter(
                transactionType =>
                  isInventoryUpdatesEnabled || transactionType !== CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT
              )
              .map(transactionType => ({
                label: firstLetterUpperCase(transactionType.replaceAll("_", " ")),
                value: transactionType,
              })),
          }}
        />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        if (!type) return null

        const { icon: Icon, label, color } = CASES_TRANSACTIONS_TYPE_DETAILS[type as CasesTransactionsTypeEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        const caseName = getCaseName({
          pricePerBarCents: row.original.pricePerBarCents ?? 0,
          barsPerCase: row.original.barsPerCase ?? 60,
        })

        const freeCase = row.original.costPerCaseCents === 0 && type === String(CasesTransactionsTypeEnum.DELIVERED)
        const isAdjustment = type === String(CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT)

        return (
          <div className="flex items-start gap-2 flex-col">
            <div className={cn("flex items-center gap-2", colorClasses.text)}>
              <Icon size={16} /> <div>{label}</div>
            </div>
            <div className="text-sm text-gray-500">
              {caseName}
              {freeCase && <span className="text-sm text-gray-500"> (Free)</span>}
            </div>
            {isAdjustment && row.original.note && (
              <div className="max-w-[280px] whitespace-normal break-words text-sm text-gray-500">
                “{row.original.note}”
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "user.pin",
      sortingFn: "basic",
      header: props => <DataTableColumnHeader {...props} title="PIN" />,
      cell: ({ row }) => <>{row.original.user?.pin ?? "-"}</>,
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
      header: props => <DataTableColumnHeader {...props} title="Number of Cases" />,
      cell: ({ row }) =>
        row.original.type === String(CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT) ? (
          <span className="font-semibold text-destructive">−{row.original.quantity}</span>
        ) : (
          <>{row.original.quantity}</>
        ),
    },
    {
      accessorKey: "createdByUser.fullName",
      header: props => <DataTableColumnHeader {...props} title="Created By" />,
      cell: props => <DataTableCell {...props} value={props.row.original.createdByUser} type="nameAndEmail" />,
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedCasesTransaction(row.original)} />,
    },
  ]

  return (
    <>
      <CampaignsSmallCards campaignId={campaignId} />

      <DataTable
        id="cases-transactions-list-"
        data={data ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Log a Delivery For Accurate Inventory",
          description:
            "Recording a delivery is essential to maintaining accurate stock levels and a\nclear financial view of your fundraiser.",
          icon: Box,
          proTip:
            "Record each delivery as it arrives. For most fundraisers, this step will only need to be completed once.",
          searchTitle: "No Inventory Records",
          buttonText: "Add Cases Delivered",
        }}
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [{ accessorKey: "user.fullName", name: "Participant" }],
        }}
        newButton={
          canCreate
            ? {
                text: "Add Cases Delivered",
                onClick: () => setCreateTransaction(true),
                disabled: !campaignIsActive,
              }
            : undefined
        }
        additionalButtons={[
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
          ...(isInventoryUpdatesEnabled && canCreate
            ? [
                {
                  text: "Inventory Adjustments",
                  variant: "outline" as const,
                  className:
                    "bg-white border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive",
                  icon: Minus,
                  infoTooltip: INVENTORY_ADJUSTMENT_TOOLTIP,
                  onClick: () => setShowAdjustmentForm(true),
                  disabled: !campaignIsActive,
                },
              ]
            : []),
        ]}
      />

      {isInventoryUpdatesEnabled && (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">{INVENTORY_DISCLAIMER}</p>
      )}

      {createTransaction && (
        <CasesDeliveredForm
          open={createTransaction}
          onOpenChange={setCreateTransaction}
          campaignId={campaignId}
          organizationId={organizationId}
        />
      )}

      {isInventoryUpdatesEnabled && showAdjustmentForm && (
        <InventoryAdjustmentForm
          open={showAdjustmentForm}
          onOpenChange={setShowAdjustmentForm}
          campaignId={campaignId}
          organizationId={organizationId}
        />
      )}

      {selectedCasesTransaction && (
        <CasesTransactionsActions
          transaction={selectedCasesTransaction}
          open={!!selectedCasesTransaction}
          onOpenChange={() => setSelectedCasesTransaction(null)}
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
          title="Download Inventory Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Inventory Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadCasesTransactionsReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
