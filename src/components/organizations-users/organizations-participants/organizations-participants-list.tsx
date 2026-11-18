"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Users } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { CampaignsUsersPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks"
import { type OrganizationUser } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { OrganizationsParticipantsActions } from "./organizations-participants-actions"
import { OrganizationsParticipantsCreate } from "./organizations-participants-create"

interface OrganizationsParticipantsListProps {
  organizationId: string
  campaignId?: string
}

export function OrganizationsParticipantsList({ organizationId }: OrganizationsParticipantsListProps) {
  const { data, isLoading } = api.organizationsUsers.getAllParticipants.useQuery({ organizationId })

  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()

  const [createUser, setCreateUser] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null)
  if (!role) return null

  const { canCreate } = getResourcePermissions(role, CampaignsUsersPermissionsEnum)

  const columns: ColumnDef<OrganizationUser>[] = [
    {
      accessorKey: "user.fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    },
    {
      accessorKey: "user.email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Info" />,
      cell: props => <DataTableCell {...props} value={props.row.original.user} type="emailAndPhone" />,
    },
    {
      accessorKey: "user.parentUser.email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Parent Contact Info" />,
      cell: props => {
        const parentUser = props.row.original.user?.parentUser
        if (!parentUser) return "-"

        return <DataTableCell {...props} value={props.row.original.user?.parentUser} type="emailAndPhone" />
      },
    },
    {
      accessorKey: "eligible",
      accessorFn: row => row.eligible.toString(),
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Eligible"
          facetedFilter={{
            type: "single",
            accessorKey: "eligible",
            options: [
              { label: "Eligible", value: "true" },
              { label: "Ineligible", value: "false" },
            ],
          }}
        />
      ),
      cell: props => <DataTableCell {...props} value={props.row.original.eligible} type="boolean" />,
    },
    {
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedUser(row.original)} />,
    },
  ]

  return (
    <>
      <DataTable
        data={data ?? []}
        initialPageSize={50}
        emptyState={{
          title: "Organization's participants will appear here",
          description: "Add new participant to get started.",
          icon: Users,
        }}
        newButton={
          canCreate
            ? {
                text: "Add Participant",
                onClick: () => setCreateUser(true),
              }
            : undefined
        }
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [
            { accessorKey: "user.fullName", name: "Name" },
            { accessorKey: "user.email", name: "Email" },
          ],
        }}
      />

      {createUser && (
        <OrganizationsParticipantsCreate
          organizationId={organizationId}
          open={createUser}
          onOpenChange={() => setCreateUser(false)}
        />
      )}

      {selectedUser && (
        <OrganizationsParticipantsActions
          organizationUser={selectedUser}
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
          setSelectedUser={setSelectedUser}
        />
      )}
    </>
  )
}
