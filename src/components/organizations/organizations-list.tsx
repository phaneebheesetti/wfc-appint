"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Building, Eye } from "lucide-react"
import Link from "next/link"
import { parseAsStringEnum, useQueryState } from "nuqs"
import posthog from "posthog-js"
import { useMemo, useState } from "react"

import { DataTable, DataTableCell, DataTableColumnHeader, DataTableRowActions } from "@/components/data-table"
import { OrganizationsCreate } from "@/components/organizations"
import { Address } from "@/components/ui/address"
import { Button } from "@/components/ui/button"
import { OrganizationsPermissionsEnum } from "@/constants/permissions"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useDataTablePaginationQueryState, useDataTableQueryStates, useHashMatch, useLoggedInUser } from "@/hooks"
import type { Organization, User } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores/permissions-store"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { OrganizationsActions } from "./organizations-actions"

const ACCOUNT_NUMBER_SEARCH_MIN_LENGTH = 3

export function OrganizationsList() {
  const { queryPagination } = useDataTablePaginationQueryState()
  const { querySearch, resetQuerySearch, queryFilters, querySort } = useDataTableQueryStates({
    id: "organizations-list-",
    defaultOrderBy: "name",
  })

  // Stored in the URL like querySearch
  const [searchBy, setSearchBy] = useQueryState(
    "organizations-list-searchBy",
    parseAsStringEnum<"name" | "accountNumber">(["name", "accountNumber"]).withDefault("name")
  )
  const isSearchingByAccountNumber = searchBy === "accountNumber"

  // Account number search only applies once enough characters are typed
  const effectiveSearch =
    isSearchingByAccountNumber && querySearch.trim().length < ACCOUNT_NUMBER_SEARCH_MIN_LENGTH ? "" : querySearch

  const handleToggleSearchBy = () => {
    void setSearchBy(isSearchingByAccountNumber ? "name" : "accountNumber")
    resetQuerySearch()
  }

  const { loggedInRole: role, loggedInUserId } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)

  const { matches: shouldShowCreateForm, clearHash } = useHashMatch("#create-form")

  const [createOrganization, setCreateOrganization] = useState<boolean>(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [selectedOrgFCDetails, setSelectedOrgFCDetails] = useState<User | null>(null)

  const isAdmin = [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN].includes(role ?? RolesEnum.USER)

  const { data: adminData, isLoading: adminLoading } = api.organizations.listPaginated.useQuery(
    {
      ...queryPagination,
      ...querySort,
      search: effectiveSearch,
      searchBy,
      stripeConnectedAccount: queryFilters?.stripeConnectedAccount?.length
        ? !!queryFilters?.stripeConnectedAccount[0]
        : undefined,
      adminUserId: queryFilters?.adminUserId?.[0] as string,
      createdByUserId: queryFilters?.createdByUserId?.[0] as string,
    },
    { enabled: isAdmin }
  )

  const { data: userData, isLoading: userLoading } = api.organizations.listPaginatedFromUserId.useQuery(
    {
      userId: loggedInUserId!,
      role,
      ...queryPagination,
      ...querySort,
      search: effectiveSearch,
      searchBy,
      stripeConnectedAccount: queryFilters?.stripeConnectedAccount?.length
        ? !!queryFilters?.stripeConnectedAccount[0]
        : undefined,
      adminUserId: queryFilters?.adminUserId?.[0] as string,
      createdByUserId: queryFilters?.createdByUserId?.[0] as string,
    },
    { enabled: !isAdmin && !!loggedInUserId }
  )

  const { data: organizationsAdminsData = [] } = api.users.listByRoles.useQuery({
    roles: [RolesEnum.ORGANIZATION_ADMIN],
  })

  const { data: organizationsCreatedByUsersData = [] } = api.users.listByRoles.useQuery({
    roles: [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN, RolesEnum.SALES_MANAGER, RolesEnum.SALES_REPRESENTATIVE],
  })

  const data = isAdmin ? adminData : userData
  const isLoading = isAdmin ? adminLoading : userLoading

  const organizationsAdminsOptions = useMemo(() => {
    return organizationsAdminsData
      ?.filter(admin => admin?.fullName)
      .map(admin => ({
        label: getUserDisplayName(admin),
        value: admin.id ?? "",
      }))
  }, [organizationsAdminsData])

  const organizationsCreatedByUsersOptions = useMemo(() => {
    return organizationsCreatedByUsersData
      ?.filter(user => user?.fullName)
      .map(user => ({
        label: getUserDisplayName(user),
        value: user.id ?? "",
      }))
  }, [organizationsCreatedByUsersData])

  const fundraisingConsultantUsers = useMemo(() => {
    return organizationsCreatedByUsersData?.filter(
      user =>
        user.role === RolesEnum.SALES_REPRESENTATIVE &&
        (user.status === UsersStatusEnum.ACTIVE || user.status === UsersStatusEnum.PENDING)
    )
  }, [organizationsCreatedByUsersData])

  const columns: ColumnDef<Organization>[] = useMemo(
    () => [
      {
        id: "view",
        cell: ({ row }) => (
          <Link href={`/dashboard/organizations/${row.original.id}`}>
            <Button variant="secondary">
              <Eye /> View
            </Button>
          </Link>
        ),
      },
      {
        accessorKey: "accountNumber",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Account Number"
            className="[&_button]:justify-start [&_button]:text-left [&_button_span]:w-min"
          />
        ),
        cell: ({ row }) => {
          const accountNumber = row.original.accountNumber?.trim()
          if (!accountNumber) return "-"

          return accountNumber
        },
      },
      {
        accessorKey: "name",
        size: 250,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      },
      {
        accessorKey: "adminUser.fullName",
        size: 250,
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Admin"
            facetedFilter={{
              type: "single",
              accessorKey: "adminUserId",
              options: organizationsAdminsOptions,
            }}
          />
        ),
        cell: props => (
          <div className="[&_div]:whitespace-normal [&_div]:[overflow-wrap:anywhere]">
            <DataTableCell {...props} type="nameAndEmail" value={props.row.original.adminUser} />
          </div>
        ),
      },
      {
        accessorKey: "street",
        header: props => <DataTableColumnHeader {...props} title="Address" />,
        cell: ({ row }) => {
          const { street, city, state, postalCode } = row.original ?? {}

          if (!street && !city && !state && !postalCode) {
            return null
          }

          return <Address street={street ?? ""} city={city ?? ""} state={state ?? ""} postalCode={postalCode ?? ""} />
        },
      },
      {
        enableSorting: false,
        accessorKey: "stripeConnectedAccountId",
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Stripe Account"
            className="[&_button]:justify-start [&_button]:text-left [&_button_span]:w-min"
            facetedFilter={{
              type: "single",
              accessorKey: "stripeConnectedAccount",
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
        cell: props => (
          <DataTableCell {...props} type="boolean" value={!!props.row.original.stripeConnectedAccountId} />
        ),
      },
      {
        accessorKey: "createdByUser.fullName",
        size: 250,
        header: props => (
          <DataTableColumnHeader
            {...props}
            title="Created By"
            facetedFilter={{
              type: "single",
              accessorKey: "createdByUserId",
              options: organizationsCreatedByUsersOptions,
            }}
          />
        ),
        cell: props => (
          <div className="[&_div]:whitespace-normal [&_div]:[overflow-wrap:anywhere]">
            <DataTableCell {...props} type="nameAndEmail" value={props.row.original.createdByUser} />
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions
            row={row}
            onClick={async () => {
              posthog.capture("organization_details", {
                organization_id: row.original.id,
                organization_name: row.original.name,
                city: row.original.city,
                state: row.original.state,
                postal_code: row.original.postalCode,
              })
              const organizationFCUser = await utils.users.getById.fetch({
                id: !!row.original.fundraisingConsultantUserId
                  ? row.original.fundraisingConsultantUserId
                  : row.original.createdByUserId,
              })
              setSelectedOrgFCDetails(organizationFCUser)
              if (
                !!organizationFCUser &&
                organizationFCUser.role === RolesEnum.SALES_REPRESENTATIVE &&
                (organizationFCUser.status === UsersStatusEnum.ACTIVE ||
                  organizationFCUser.status === UsersStatusEnum.PENDING)
              ) {
                setSelectedOrganization({ ...row.original, fundraisingConsultantUser: organizationFCUser })
                posthog.capture("organization_sales_representative_details", {
                  organization_id: row.original.id,
                  organization_name: row.original.name,
                  sales_representative_name: organizationFCUser?.fullName,
                  sales_representative_email: organizationFCUser?.email,
                })
              } else {
                setSelectedOrganization({ ...row.original, fundraisingConsultantUser: null })
                posthog.capture("organization_sales_representative_details", {
                  organization_id: row.original.id,
                  organization_name: row.original.name,
                  sales_representative_name: "Unassigned",
                })
              }
            }}
          />
        ),
      },
    ],
    [organizationsAdminsOptions, organizationsCreatedByUsersOptions]
  )

  const utils = api.useUtils()

  if (!role) return null
  const { canCreate } = getResourcePermissions(role, OrganizationsPermissionsEnum)

  if (!createOrganization && shouldShowCreateForm && canCreate) {
    setCreateOrganization(true)
    clearHash()
  }

  return (
    <>
      <DataTable
        id="organizations-list-"
        data={data?.data ?? []}
        pagination={data?.pagination}
        emptyState={{
          title: "Help Your Organization Get Started",
          description:
            "Create an Organization so they can begin using WFCentral to manage their fundraiser with more ease, visibility, and confidence.",
          icon: Building,
          proTip: "An organization only gets created once. From there, it's easy to launch multiple fundraisers.",
          searchTitle: "No Organizations",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Organization",
                onClick: () => setCreateOrganization(true),
              }
            : undefined
        }
        loading={isLoading}
        searchModeToggle={{
          label: isSearchingByAccountNumber ? "Search by organization name" : "Search by account number",
          onClick: handleToggleSearchBy,
        }}
        columns={columns}
        multiColumnFilter={{
          columns: isSearchingByAccountNumber
            ? [{ accessorKey: "accountNumber", name: "Account Number" }]
            : [{ accessorKey: "name", name: "Name" }],
          placeholder: isSearchingByAccountNumber ? "Enter account number" : "Enter organization name",
        }}
      />

      {createOrganization && (
        <OrganizationsCreate open={createOrganization} onOpenChange={() => setCreateOrganization(false)} />
      )}

      {selectedOrganization && selectedOrgFCDetails && (
        <OrganizationsActions
          organization={selectedOrganization}
          organizationFCDetails={selectedOrgFCDetails}
          fundraisingConsultantUsers={fundraisingConsultantUsers}
          open={!!selectedOrganization}
          onOpenChange={() => {
            setSelectedOrganization(null)
            setSelectedOrgFCDetails(null)
          }}
        />
      )}
    </>
  )
}
