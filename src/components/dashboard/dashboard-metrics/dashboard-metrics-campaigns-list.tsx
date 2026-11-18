"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Eye, FileDown, FileSpreadsheet, FileText, Megaphone } from "lucide-react"
import { useMemo } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader } from "@/components/data-table"
import { Address } from "@/components/ui/address"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_STATUS_DETAILS, CampaignsStatusEnum } from "@/constants/campaigns"
import { COLOR_MAP } from "@/constants/colors"
import { RolesEnum } from "@/constants/roles"
import { useDataTablePaginationQueryState, useDataTableQueryStates, useLoggedInUser } from "@/hooks"
import type { Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate, getPercentageOfTimePassed } from "@/utils/date"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { firstLetterUpperCase } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

interface DashboardMetricsCampaignsListProps {
  selectedCampaignId: string | null
  setSelectedCampaignId: (campaignId: string | null) => void
}

export function DashboardMetricsCampaignsList({
  selectedCampaignId,
  setSelectedCampaignId,
}: DashboardMetricsCampaignsListProps) {
  const { queryPagination } = useDataTablePaginationQueryState({ limit: 5 })
  const { querySearch, queryFilters, querySort } = useDataTableQueryStates({ defaultOrderBy: "organization_name" })

  const { loggedInRole: role } = useLoggedInUser()
  const utils = api.useUtils()

  const { data: campaignsData, isLoading } = api.campaigns.getAllPaginated.useQuery({
    ...queryPagination,
    ...querySort,
    search: querySearch ?? "",
    sponsorId: queryFilters?.sponsorId?.[0] as string,
    status: queryFilters?.status?.[0] as string,
  })

  const { data: organizationsAdminsData = [] } = api.users.listByRoles.useQuery({
    roles: [RolesEnum.ORGANIZATION_ADMIN],
  })

  const { mutateAsync: downloadReport, isPending: isDownloadingReport } =
    api.campaigns.downloadReportByCampaignId.useMutation()

  const downloadCampaignReport = async (type: FileReportType) => {
    if (!selectedCampaignId) return

    const campaign = await utils.campaigns.getById.fetch({ id: selectedCampaignId })
    const fileName = `fundraiser-report-${campaign?.name ?? ""}`

    const data = await downloadReport({ campaignId: selectedCampaignId })

    await downloadFileReport({
      type,
      fileName,
      data: data as unknown as Record<string, string | number>[],
      sheetName: "Fundraiser Report",
    })
  }

  const organizationsAdminsOptions = useMemo(() => {
    return (organizationsAdminsData ?? [])
      ?.filter(admin => admin?.fullName)
      .map(admin => ({
        label: getUserDisplayName(admin),
        value: admin.id ?? "",
      }))
  }, [organizationsAdminsData])

  const columns: ColumnDef<Campaign>[] = useMemo(
    () => [
      {
        id: "view",
        cell: ({ row }) => {
          const isSelected = row.original.id === selectedCampaignId

          return (
            <Button
              variant={isSelected ? "default" : "secondary"}
              onClick={() => setSelectedCampaignId(row.original.id)}
              disabled={isSelected}
            >
              <Eye /> {isSelected ? "Selected" : "View"}
            </Button>
          )
        },
      },
      {
        accessorKey: "organization.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
      },
      {
        accessorKey: "organization.street",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
        cell: ({ row }) => {
          const organization = row.original.organization

          return (
            <Address
              street={organization?.street ?? ""}
              city={organization?.city ?? ""}
              state={organization?.state ?? ""}
              postalCode={organization?.postalCode ?? ""}
            />
          )
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fundraiser" />,
      },
      {
        accessorKey: "sponsor.fullName",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Sponsor"
            facetedFilter={{
              type: "single",
              accessorKey: "sponsorId",
              options: organizationsAdminsOptions,
            }}
          />
        ),
        cell: props => <DataTableCell {...props} type="nameAndEmail" value={props.row.original.sponsor} />,
      },
      {
        accessorKey: "status",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Status"
            facetedFilter={{
              type: "single",
              accessorKey: "status",
              options: Object.values(CampaignsStatusEnum).map(status => ({
                label: firstLetterUpperCase(status),
                value: status,
              })),
            }}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.status as CampaignsStatusEnum
          if (!status) return null

          const { icon: Icon, label, color } = CAMPAIGN_STATUS_DETAILS[status]
          const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

          return (
            <div className={`flex items-center gap-1 ${colorClasses.text}`}>
              <Icon size={16} />
              {label}
            </div>
          )
        },
      },
      {
        enableSorting: false,
        accessorKey: "startDate",
        filterFn: "dateBetween",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Start / End Dates"
            facetedFilter={{
              type: "date",
              accessorKey: "startDate",
            }}
          />
        ),
        cell: props => {
          const { startDate, endDate } = props.row.original

          const percentageOfTimePassed = getPercentageOfTimePassed(startDate, endDate)

          return (
            <DataTableCell
              {...props}
              type="progress"
              progress={percentageOfTimePassed}
              value={
                <div className="mb-1 text-xs text-muted-foreground">
                  {formatDate(startDate, { month: "short" })} - {formatDate(endDate, { month: "short" })}
                </div>
              }
            />
          )
        },
      },
    ],
    [organizationsAdminsOptions, selectedCampaignId]
  )

  if (!role) return null

  return (
    <>
      <DataTable
        data={campaignsData?.data ?? []}
        pagination={campaignsData?.pagination}
        initialPageSize={5}
        emptyState={{
          title: "Fundraisers will appear here",
          description: "Create a fundraiser to get started",
          icon: Megaphone,
        }}
        loading={isLoading}
        columns={columns}
        multiColumnFilter={{
          columns: [
            { accessorKey: "organization.name", name: "Organization" },
            { accessorKey: "organization.street", name: "Location" },
            { accessorKey: "name", name: "Fundraiser" },
          ],
        }}
        additionalButtons={
          selectedCampaignId
            ? [
                {
                  text: isDownloadingReport ? "Downloading Report..." : "Download selected fundraiser report",
                  onClick: () => void 0,
                  icon: FileDown,
                  disabled: isDownloadingReport ?? !selectedCampaignId,
                  buttons: [
                    {
                      text: "Excel File",
                      onClick: () => void downloadCampaignReport(FileReportType.EXCEL),
                      icon: FileSpreadsheet,
                    },
                    {
                      text: "CSV File",
                      onClick: () => void downloadCampaignReport(FileReportType.CSV),
                      icon: FileText,
                    },
                  ],
                },
              ]
            : undefined
        }
      />
    </>
  )
}
