"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Box, Eye } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"

import { InventoryCasesActions } from "./inventory-cases-actions"

export enum InventoryCasesPaymentStatusTypeEnum {
  PAID = "paid",
  CHECKED_OUT = "checked-out",
}

// Define the aggregated data type
interface InventoryAggregateData {
  campaignId: string
  campaignName: string
  totalCasesCheckedOut: number
  totalCasesPaid: number
  totalAmountOwedCents: number
  totalAmountPaidCents: number
  pricePerCaseCents: number
  participants: Set<string>
  participantNames: string[]
  createdAt: Date
}

export function InventoryCasesList() {
  const { loggedInUserId } = useLoggedInUser()
  const [inventoryData, setInventoryData] = useState<InventoryAggregateData | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)

  // Fetch aggregated data for parent role only
  const { data: inventoryAggregateData, isLoading } = api.casesTransactions.getAggregatedByParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId }
  )

  const handleActionClick = (row: InventoryAggregateData) => {
    setInventoryData(row)
    setIsActionsOpen(true)
  }

  const campaignNameOptions = useMemo(
    () =>
      Array.from(new Set((inventoryAggregateData ?? []).map(campaign => campaign.campaignName).filter(Boolean))).map(
        name => ({
          label: name,
          value: name,
        })
      ),
    [inventoryAggregateData]
  )

  const columns: ColumnDef<InventoryAggregateData>[] = useMemo(
    () => [
      {
        accessorKey: "campaignName",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Fundraiser"
            facetedFilter={{
              type: "single",
              accessorKey: "campaignName",
              options: campaignNameOptions,
            }}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const campaignName = row.original.campaignName
          const createdAt = row.original.createdAt

          return (
            <div className="max-w-[130px] sm:max-w-[200px]">
              <div className="font-medium truncate">{campaignName ?? "Unknown Fundraiser"}</div>
              <div className="text-sm text-muted-foreground truncate">{formatDate(createdAt)}</div>
            </div>
          )
        },
      },
      {
        accessorKey: "participantNames" as keyof InventoryAggregateData,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Members" />,
        enableSorting: false,
        cell: ({ row }) => {
          const participantNames = row.original.participantNames
          const displayNames = participantNames.slice(0, 2).join(", ")
          const remainingCount = participantNames.length - 2

          return (
            <div className="font-medium">
              {displayNames}
              {remainingCount > 0 && <span className="text-muted-foreground"> +{remainingCount} more</span>}
            </div>
          )
        },
      },
      {
        accessorKey: "Cases",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cases" />,
        enableSorting: false,
        cell: ({ row }) => {
          const paidCases = Math.floor(row.original.totalCasesPaid)
          const checkedOutCases = Math.floor(row.original.totalCasesCheckedOut)

          return (
            <div className="font-xs text-muted-foreground lowercase">
              {`${paidCases} paid`}
              <br />
              {`${checkedOutCases} checked out`}
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => handleActionClick(row.original)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [campaignNameOptions]
  )

  return (
    <>
      <DataTable
        data={inventoryAggregateData ?? []}
        columns={columns}
        loading={isLoading}
        emptyState={{
          title: "No inventory data",
          description: "Inventory will appear here once participants check out or pay for cases.",
          icon: Box,
        }}
        multiColumnFilter={{
          columns: [{ accessorKey: "campaignName", name: "Fundraiser" }],
        }}
      />

      <InventoryCasesActions inventoryData={inventoryData} open={isActionsOpen} onOpenChange={setIsActionsOpen} />
    </>
  )
}
