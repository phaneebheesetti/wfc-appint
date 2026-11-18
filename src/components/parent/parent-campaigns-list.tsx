"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Eye, Megaphone } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { CAMPAIGN_STATUS_DETAILS, type CampaignsStatusEnum } from "@/constants/campaigns"
import { COLOR_MAP } from "@/constants/colors"
import { type CampaignUser } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

interface ParentCampaignsListProps {
  userId: string
}

export function ParentCampaignsList({ userId }: ParentCampaignsListProps) {
  const { data: campaigns = [], isLoading } = api.campaigns.getCampaignsForParent.useQuery(
    { parentId: userId },
    { enabled: !!userId }
  )

  const participantOptions = useMemo(
    () =>
      (campaigns ?? [])
        .filter(campaignUser => campaignUser.user?.fullName)
        .map(campaignUser => ({
          label: getUserDisplayName(campaignUser.user),
          value: campaignUser.user?.fullName ?? "",
        })),
    [campaigns]
  )

  const columns: ColumnDef<CampaignUser>[] = useMemo(
    () => [
      {
        id: "view",
        cell: ({ row }) => (
          <Link href={`/dashboard/campaigns/${row.original.campaignId}?userId=${row.original.userId}`}>
            <Button variant="secondary">
              <Eye /> View
            </Button>
          </Link>
        ),
      },
      {
        accessorKey: "campaign.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      },
      {
        accessorKey: "organization.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Organization" />,
      },
      {
        accessorKey: "user.fullName",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Participant"
            facetedFilter={{
              type: "single",
              accessorKey: "user.fullName",
              options: participantOptions,
            }}
          />
        ),
      },
      {
        accessorKey: "campaign.status",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Status"
            facetedFilter={{
              type: "single",
              accessorKey: "campaign.status",
              options: [
                { label: "Active", value: "active" },
                { label: "Closed", value: "ended" },
              ],
            }}
          />
        ),
        cell: ({ row }) => {
          const status = row.original.campaign?.status as CampaignsStatusEnum
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
    ],
    [participantOptions]
  )

  return (
    <DataTable
      data={campaigns}
      columns={columns}
      loading={isLoading}
      emptyState={{
        title: "No fundraisers found",
        icon: Megaphone,
      }}
      multiColumnFilter={{
        columns: [
          { accessorKey: "campaign.name", name: "Name" },
          { accessorKey: "user.fullName", name: "Participant" },
          { accessorKey: "campaign.status", name: "Status" },
        ],
      }}
    />
  )
}
