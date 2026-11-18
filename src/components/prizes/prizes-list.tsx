"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { FileDown, FileSpreadsheet, FileText, Trophy } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { ImageWithFallback } from "@/components/ui/image"
import { PrizesPermissionsEnum } from "@/constants/permissions"
import { PRIZE_GOAL_TYPE_DETAILS, PrizeGoalTypeEnum } from "@/constants/prize"
import { useLoggedInUser } from "@/hooks"
import type { Prize } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores/permissions-store"
import { api } from "@/trpc/react"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { formatPrizeReportForExport } from "@/utils/prizes"

import { AlertDialogConfirm } from "../ui/alert-dialog"
import { PrizesActions } from "./prizes-actions"
import { PrizesCreate } from "./prizes-create"

interface PrizesListProps {
  organizationId: string
  campaignId: string
  campaignIsActive: boolean
}

export function PrizesList({ organizationId, campaignId, campaignIsActive }: PrizesListProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const utils = api.useUtils()

  const [createPrize, setCreatePrize] = useState<boolean>(false)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)

  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data: prizes, isLoading } = api.prizes.listByCampaignId.useQuery({ campaignId })
  const { data: prizesOverview } = api.campaigns.getPrizesOverview.useQuery({ campaignId })
  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.prizes.downloadReportByCampaignId.useMutation()
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<FileReportType | null>(null)
  if (!role) return null
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
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
    await downloadPrizesReport(type)
  }
  const downloadPrizesReport = async (type: FileReportType) => {
    const fileName = `prizes-report-${campaign?.name ?? ""}`

    const data = await downloadReport({ campaignId })
    const dataForExport = formatPrizeReportForExport({ data })

    await downloadFileReport({
      type,
      fileName,
      data: dataForExport as unknown as Record<string, string | number>[],
      sheetName: "Prizes Report",
    })
  }

  const { canCreate } = getResourcePermissions(role, PrizesPermissionsEnum)

  const columns: ColumnDef<Prize>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: props => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 rounded-md overflow-hidden">
            <ImageWithFallback
              src={props.row.original.imageUrl ?? ""}
              alt={props.row.original.name}
              width={64}
              height={64}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-medium truncate max-w-[200px]">{props.row.original.name}</div>
            <div className="text-sm text-muted-foreground truncate max-w-[200px]">{props.row.original.description}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "goalType",
      sortingFn: (rowA, rowB) => {
        const casesGoalA = rowA.original.casesGoal ?? 0
        const casesGoalB = rowB.original.casesGoal ?? 0

        return casesGoalA - casesGoalB
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Prize Goal" />,
      cell: props => {
        const casesGoal = props.row.original.casesGoal ?? 0

        return (
          <div className="flex items-center gap-1">
            <div className="text-sm text-muted-foreground">
              {PRIZE_GOAL_TYPE_DETAILS[props.row.original.goalType as PrizeGoalTypeEnum].label}
            </div>
            {casesGoal > 0 && (
              <div className="w-full text-sm text-muted-foreground">({props.row.original.casesGoal} cases)</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "participantsEligible",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Participants Paid / Eligible" />,
      cell: props => {
        const prizeId = props.row.original.id
        const eligibleCount = prizesOverview?.prizesInfoById[prizeId]?.participants?.eligibleCount ?? 0

        return <div className="flex items-center gap-2">{eligibleCount ?? 0}</div>
      },
    },
    {
      accessorKey: "unpaidEligibleParticipants",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Participants Unpaid" />,
      cell: props => {
        const prizeId = props.row.original.id
        const prizeInfo = prizesOverview?.prizesInfoById[prizeId]
        const unpaidCount = prizeInfo?.participants?.unpaidCount ?? 0

        return (
          <div className="flex items-center gap-2">
            {prizeInfo?.goalType === PrizeGoalTypeEnum.CASE_PAYMENT ? unpaidCount : "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
      cell: props => <DataTableCell {...props} type="boolean" />,
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedPrize(row.original)} />,
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Prizes</h2>
      </div>

      <DataTable
        id="prizes-list-"
        data={prizes ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Motivate participants with rewards",
          description:
            "Prizes encourage participation, create friendly competition, and help boost\nsales. Reward top performers and celebrate fundraising success.",
          icon: Trophy,
          proTip: "Even small rewards can significantly increase engagement and sales activity.",
          searchTitle: "No Prizes",
          buttonText: "Add Prize",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Prize",
                onClick: () => setCreatePrize(true),
                disabled: !campaignIsActive,
              }
            : undefined
        }
        loading={isLoading}
        columns={columns}
        multiColumnFilter={{
          columns: [{ accessorKey: "name", name: "Name" }],
        }}
        additionalButtons={[
          {
            text: isDownloadingReport ? "Downloading Report..." : "Download Report",
            variant: "secondary",
            onClick: () => void 0,
            icon: FileDown,
            disabled: isDownloadingReport ?? prizes?.length === 0,
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

      {createPrize && (
        <PrizesCreate
          open={createPrize}
          onOpenChange={() => {
            setCreatePrize(false)
            void utils.prizes.listByCampaignId.invalidate()
            void utils.campaigns.getPrizesOverview.invalidate()
            void utils.campaigns.getParticipantsByEvent.invalidate()
          }}
          campaignId={campaignId}
          organizationId={organizationId}
        />
      )}

      {selectedPrize && (
        <PrizesActions
          campaignId={campaignId}
          prize={selectedPrize}
          open={!!selectedPrize}
          onOpenChange={() => setSelectedPrize(null)}
          campaignIsActive={campaignIsActive}
          organizationId={organizationId}
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
          title="Download Prizes Report"
          description="This report may include participant names. Once downloaded, the report will exist outside WFCentral and cannot be automatically re-redacted when temporary access expires. Download and use this report only as needed to support, administer, troubleshoot, or help manage this fundraiser. Do not use or share Participant Information for any other purpose."
          confirmText="I Acknowledge"
          onConfirm={async () => {
            if (!selectedReportType) return
            await createAccessLog({
              campaignId,
              eventType: "DOWNLOAD_REPORT",
              reportName: "Prizes Report",
              fileType: fileTypeMap[selectedReportType] ?? null,
            })
            await downloadPrizesReport(selectedReportType)
            setShowDownloadConfirm(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </>
  )
}
