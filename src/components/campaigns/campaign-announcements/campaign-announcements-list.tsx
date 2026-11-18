import type { ColumnDef } from "@tanstack/react-table"
import { Mail, Users } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { stripHtml } from "string-strip-html"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import {
  CAMPAIGN_ANNOUNCEMENTS_STATUS_DETAILS,
  CAMPAIGN_ANNOUNCEMENTS_TYPE_DETAILS,
  CampaignAnnouncementStatusEnum,
  type CampaignAnnouncementTypeEnum,
} from "@/constants/campaign-announcements"
import { COLOR_MAP } from "@/constants/colors"
import { type CampaignAnnouncement } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { firstLetterUpperCase } from "@/utils/string"

import { CampaignAnnouncementsActions } from "./campaign-announcements-actions"
import { CampaignAnnouncementsCreate } from "./campaign-announcements-create"

interface CampaignAnnouncementsListProps {
  campaignId: string
  organizationId: string
  campaignIsActive: boolean
}

export function CampaignAnnouncementsList({
  campaignId,
  organizationId,
  campaignIsActive,
}: CampaignAnnouncementsListProps) {
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const [createMessage, setCreateMessage] = useState(!!userId)

  const { data: messages, isLoading } = api.campaignAnnouncements.listByCampaignId.useQuery({ campaignId })
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<CampaignAnnouncement | null>(null)

  const columns: ColumnDef<CampaignAnnouncement>[] = [
    {
      accessorKey: "createdAt",
      header: props => <DataTableColumnHeader {...props} title="Date" />,
      cell: props => <DataTableCell {...props} type="datetime" value={props.row.original.createdAt} />,
    },
    {
      accessorKey: "title",
      header: props => <DataTableColumnHeader {...props} title="Title" />,
      cell: props => (
        <div className="truncate max-w-[200px]" title={props.row.original.title}>
          {props.row.original.title}
        </div>
      ),
    },
    {
      accessorKey: "content",
      header: props => <DataTableColumnHeader {...props} title="Content" />,
      cell: props => <div className="truncate max-w-[200px]">{stripHtml(props.row.original.content).result}</div>,
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
            options: Object.values(CAMPAIGN_ANNOUNCEMENTS_TYPE_DETAILS).map(type => ({
              label: type.label,
              value: type.label,
            })),
          }}
        />
      ),
      cell: props => {
        const type = props.row.original.type
        if (!type) return null

        const { label, icon: Icon, color } = CAMPAIGN_ANNOUNCEMENTS_TYPE_DETAILS[type as CampaignAnnouncementTypeEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={cn("flex items-center gap-2", colorClasses.text)}>
            <Icon size={16} /> <div>{label}</div>
          </div>
        )
      },
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
            options: Object.values(CampaignAnnouncementStatusEnum).map(status => ({
              label: firstLetterUpperCase(status),
              value: status,
            })),
          }}
        />
      ),
      cell: props => {
        const status = props.row.original.status
        if (!status) return null

        const {
          label,
          icon: Icon,
          color,
        } = CAMPAIGN_ANNOUNCEMENTS_STATUS_DETAILS[status as CampaignAnnouncementStatusEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={cn("flex items-center gap-2", colorClasses.text)}>
            <Icon size={16} /> <div>{label}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "reach",
      header: props => <DataTableColumnHeader {...props} title="Reach" />,
      cell: props => (
        <div className="flex items-center gap-2">
          <Users size={16} /> <div>{props.row.original.reach}</div>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedAnnouncement(row.original)} />,
    },
  ]

  return (
    <>
      <DataTable
        id="campaign-announcements-list-"
        data={messages ?? []}
        initialPageSize={50}
        columns={columns}
        emptyState={{
          title: "Keep Everyone Informed",
          description:
            "Use communications to send announcements to participants & families. \nStronger communication leads to stronger fundraising outcomes.",
          icon: Mail,
          proTip:
            "Schedule three updates: launch and pickup details, a halfway encouragement message, and a final money-due reminder.",
          searchTitle: "No Messages",
        }}
        loading={isLoading}
        multiColumnFilter={{
          columns: [
            {
              accessorKey: "title",
              name: "Title",
            },
          ],
        }}
        newButton={{
          text: "Create a Message",
          onClick: () => setCreateMessage(true),
          disabled: !campaignIsActive,
        }}
      />

      {createMessage && (
        <CampaignAnnouncementsCreate
          open={createMessage}
          onOpenChange={setCreateMessage}
          campaignId={campaignId}
          organizationId={organizationId}
          userId={userId ?? null}
        />
      )}

      {selectedAnnouncement && (
        <CampaignAnnouncementsActions
          campaignAnnouncement={selectedAnnouncement}
          open={!!selectedAnnouncement}
          onOpenChange={() => setSelectedAnnouncement(null)}
        />
      )}
    </>
  )
}
