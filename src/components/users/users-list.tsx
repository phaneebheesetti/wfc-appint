"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Users } from "lucide-react"
import { useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { COLOR_MAP } from "@/constants/colors"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { USER_STATUS_DETAILS, UsersStatusEnum } from "@/constants/users"
import { useDataTablePaginationQueryState, useDataTableQueryStates, useLoggedInUser } from "@/hooks"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { filterAllowedInviteRoles } from "@/utils/roles"
import { firstLetterUpperCase } from "@/utils/string"

import { UsersActions } from "./users-actions"
import { UsersCreate } from "./users-create"

export function UsersList() {
  const { queryPagination } = useDataTablePaginationQueryState()
  const { querySearch, queryFilters, querySort } = useDataTableQueryStates({
    id: "users-list-",
    defaultOrderBy: "fullName",
  })

  const { loggedInRole: role } = useLoggedInUser()

  const [createUser, setCreateUser] = useState<boolean>(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { data, isLoading } = api.users.listPaginated.useQuery({
    ...queryPagination,
    ...querySort,
    search: querySearch ?? "",
    role: queryFilters?.role?.[0] as string,
    status: queryFilters?.status?.[0] as string,
  })

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "fullName",
      header: props => <DataTableColumnHeader {...props} title="Name" />,
    },
    {
      accessorKey: "email",
      header: props => <DataTableColumnHeader {...props} title="Contact Info" />,
      cell: props => <DataTableCell {...props} type="emailAndPhone" value={props.row.original} />,
    },
    {
      accessorKey: "role",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Role"
          facetedFilter={{
            type: "single",
            accessorKey: "role",
            options: Object.values(RolesEnum)
              .filter(
                role => ![RolesEnum.ADMIN, RolesEnum.PARTICIPANT, RolesEnum.PARENT, RolesEnum.USER].includes(role)
              )
              .map(role => ({
                label: ROLES_DETAILS[role as RolesEnum].label,
                value: role,
              })),
          }}
        />
      ),
      cell: ({ row }) => {
        const role = row.original.role
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
      accessorKey: "status",
      header: props => (
        <DataTableColumnHeader
          {...props}
          title="Status"
          facetedFilter={{
            type: "single",
            accessorKey: "status",
            options: Object.values(UsersStatusEnum).map(status => ({
              label: firstLetterUpperCase(status),
              value: status,
            })),
          }}
        />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        if (!status) return null

        const { icon: Icon, label, color } = USER_STATUS_DETAILS[status as UsersStatusEnum]
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
      id: "actions",
      cell: ({ row }) => <DataTableRowActions row={row} onClick={() => setSelectedUser(row.original)} />,
    },
  ]

  if (!role) return null

  return (
    <>
      <DataTable
        id="users-list-"
        data={data?.data ?? []}
        pagination={data?.pagination}
        emptyState={{
          title: "Members will appear here",
          description: "Add new member to get started.",
          icon: Users,
        }}
        newButton={
          [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN].includes(role)
            ? {
                text: "Add Member",
                onClick: () => setCreateUser(true),
              }
            : undefined
        }
        columns={columns}
        loading={isLoading}
        multiColumnFilter={{
          columns: [
            { accessorKey: "fullName", name: "Name" },
            { accessorKey: "email", name: "Email" },
          ],
        }}
      />

      {createUser && (
        <UsersCreate
          open={createUser}
          onOpenChange={() => setCreateUser(false)}
          roles={filterAllowedInviteRoles(role, [RolesEnum.WFC_ADMIN, RolesEnum.SALES_REPRESENTATIVE])}
        />
      )}

      {selectedUser && (
        <UsersActions
          user={selectedUser}
          setUser={setSelectedUser}
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        />
      )}
    </>
  )
}
