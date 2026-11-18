"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"

import { DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import type { DataTableFacetedFilterOptions } from "@/components/data-table/data-table-faceted-filter"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_STATUS_DETAILS, CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { COLOR_MAP } from "@/constants/colors"
import type { Campaign } from "@/server/db/schema"
import { formatDate, getPercentageOfTimePassed } from "@/utils/date"

interface CampaignsListColumnsProps {
  onClick?: (campaign: Campaign) => void
  sponsorOptions?: DataTableFacetedFilterOptions[]
  onClickOfViewDraft?: (campaign: Campaign) => void
}

export const campaignsListColumns = ({
  onClick,
  sponsorOptions,
  onClickOfViewDraft,
}: CampaignsListColumnsProps): ColumnDef<Campaign>[] => [
  {
    id: "view",
    cell: ({ row }) =>
      row.original.visibility === CampaignsVisibilityEnum.DRAFT ? (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              if (!!onClickOfViewDraft) onClickOfViewDraft(row.original)
            }}
          >
            <Pencil /> Edit
          </Button>
        </>
      ) : (
        <Link href={`/dashboard/organizations/${row.original.organizationId}/campaigns/${row.original.id}`}>
          <Button variant="secondary">
            <Eye /> View
          </Button>
        </Link>
      ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  {
    enableSorting: false,
    accessorKey: "sponsor.fullName",
    header: props => (
      <DataTableColumnHeader
        {...props}
        title="Sponsor"
        facetedFilter={{
          type: "single",
          accessorKey: "sponsor.fullName",
          options: sponsorOptions,
        }}
      />
    ),
    cell: props => <DataTableCell {...props} type="nameAndEmail" value={props.row.original.sponsor} />,
  },
  {
    enableSorting: false,
    accessorKey: "status",
    filterFn: (row, columnId, filterValue) => {
      const rowValue = row.getValue(columnId)

      const filters = Array.isArray(filterValue) ? filterValue : [filterValue]

      if (!rowValue) return false
      if (filters.length === 0) return true

      return filters.includes(String(rowValue))
    },
    header: props => (
      <DataTableColumnHeader
        {...props}
        title="Status"
        facetedFilter={{
          type: "single",
          accessorKey: "status",
          options: [
            { label: "Draft", value: "inactive" },
            { label: "Active", value: "active" },
            { label: "Closed", value: "ended" },
          ],
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
          {CAMPAIGN_STATUS_DETAILS[CampaignsStatusEnum.INACTIVE].label === CAMPAIGN_STATUS_DETAILS[status].label
            ? "Draft"
            : label}
        </div>
      )
    },
  },
  {
    enableSorting: false,
    accessorKey: "digitalPayment",
    header: props => (
      <DataTableColumnHeader
        {...props}
        title="Digital Payments"
        facetedFilter={{
          type: "single",
          accessorKey: "digitalPayment",
          options: [
            {
              label: "Yes",
              value: true,
            },
            {
              label: "No",
              value: false,
            },
          ],
        }}
      />
    ),
    cell: props => <DataTableCell {...props} type="boolean" />,
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
  ...(onClick
    ? ([
        {
          id: "actions",
          cell: ({ row }) =>
            row.original.visibility === CampaignsVisibilityEnum.DRAFT ? (
              <Button variant="destructive" onClick={() => onClick(row.original)}>
                <Trash2 />
              </Button>
            ) : (
              <span className="flex justify-center">
                <DataTableRowActions row={row} onClick={() => onClick(row.original)} />
              </span>
            ),
        },
      ] as ColumnDef<Campaign>[])
    : []),
]
