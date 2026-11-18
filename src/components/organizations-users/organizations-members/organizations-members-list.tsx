"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { UserCog } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { COLOR_MAP } from "@/constants/colors"
import { OrganizationsUsersPermissionsEnum } from "@/constants/permissions"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { USER_STATUS_DETAILS, UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { type OrganizationUser } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"
import { firstLetterUpperCase } from "@/utils/string"

import { OrganizationsMembersActions } from "./organizations-members-actions"
import { OrganizationsMembersCreate } from "./organizations-members-create"

interface OrganizationsMembersListProps {
  organizationId: string
}

export function OrganizationsMembersList({ organizationId }: OrganizationsMembersListProps) {
  const { data, isLoading } = api.organizationsUsers.getAllMembers.useQuery({
    organizationId,
    roles: [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
  })

  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()

  const [createUser, setCreateUser] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null)
  if (!role) return null

  const { canCreate } = getResourcePermissions(role, OrganizationsUsersPermissionsEnum)

  const columns: ColumnDef<OrganizationUser>[] = [
    {
      accessorKey: "user.fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    },
    {
      accessorKey: "user.email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contact Info" />,
      cell: props => <DataTableCell {...props} type="emailAndPhone" value={props.row.original.user} />,
    },
    {
      accessorKey: "user.role",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Role"
          facetedFilter={{
            type: "single",
            accessorKey: "user.role",
            options: [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF].map(role => ({
              label: ROLES_DETAILS[role].label,
              value: role,
            })),
          }}
        />
      ),
      cell: ({ row }) => {
        const role = row.original.user?.role
        if (!role) return null

        const { icon: Icon, label } = ROLES_DETAILS[role as RolesEnum]

        return (
          <div className={`flex items-center gap-1`}>
            <Icon size={16} />
            {label}
          </div>
        )
      },
    },
    {
      accessorKey: "user.status",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Status"
          facetedFilter={{
            type: "single",
            accessorKey: "user.status",
            options: Object.values(UsersStatusEnum).map(status => ({
              label: firstLetterUpperCase(status),
              value: status,
            })),
          }}
        />
      ),
      cell: ({ row }) => {
        const status = row.original.user?.status
        if (!status) return null

        const { icon: Icon, label, color } = USER_STATUS_DETAILS[status as UsersStatusEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={`flex items-center gap-2 ${colorClasses.text}`}>
            <Icon size={16} />
            {label}
          </div>
        )
      },
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
          title: "Invite Your Fundraising Team",
          description: "Invite staff, volunteers, or administrators to help manage your fundraiser.",
          icon: UserCog,
          proTip:
            "To keep your fundraiser running smoothly, assign financial, communications, and admin responsibilities.",
          searchTitle: "No Members",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Members",
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
        <OrganizationsMembersCreate
          open={createUser}
          onOpenChange={() => setCreateUser(false)}
          organizationId={organizationId}
        />
      )}

      {selectedUser && (
        <OrganizationsMembersActions
          organizationUser={selectedUser}
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        />
      )}
    </>
  )
}
