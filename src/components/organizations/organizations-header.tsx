"use client"

import { ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import { useEffect, useMemo, useState } from "react"

import { NotFound } from "@/components/not-found"
import { OrganizationsActions } from "@/components/organizations"
import { Address } from "@/components/ui/address"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { WithTooltip } from "@/components/ui/tooltip"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import type { Organization, User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

interface OrganizationsHeaderProps {
  organizationId: string
  goBackHref?: string
  goBackLabel?: string
}

export function OrganizationsHeader({
  organizationId,
  goBackHref,
  goBackLabel = "Go back to the organization",
}: OrganizationsHeaderProps) {
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)

  const { data: organization, isLoading } = api.organizations.getById.useQuery({ id: organizationId })
  const [selectedOrgFCDetails, setSelectedOrgFCDetails] = useState<User | null>(null)
  const utils = api.useUtils()

  const { data: organizationsCreatedByUsersData = [] } = api.users.listByRoles.useQuery({
    roles: [RolesEnum.SALES_REPRESENTATIVE],
  })

  const fundraisingConsultantUsers = useMemo(() => {
    return organizationsCreatedByUsersData?.filter(
      user => user.status === UsersStatusEnum.ACTIVE || user.status === UsersStatusEnum.PENDING
    )
  }, [organizationsCreatedByUsersData])

  useEffect(() => {
    if (!organization) return

    posthog.capture("organization_details", {
      organization_id: organization.id,
      organization_name: organization.name,
      city: organization.city,
      state: organization.state,
      postal_code: organization.postalCode,
    })
  }, [organization])

  if (isLoading) {
    return <OrganizationsHeaderLoading />
  }

  if (!organization) {
    return <NotFound />
  }

  const { street, city, state, postalCode } = organization ?? {}

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-2xl font-semibold first-letter:uppercase">
            {goBackHref && (
              <WithTooltip
                content={goBackLabel}
                side="top"
                trigger={
                  <Link href={goBackHref}>
                    <ArrowLeft />
                  </Link>
                }
              />
            )}
            {organization?.name}
          </h2>

          <Address showIcon street={street ?? ""} city={city ?? ""} state={state ?? ""} postalCode={postalCode ?? ""} />
        </div>

        <div className="flex flex-col-reverse gap-2 md:flex-row">
          <div className="flex flex-col text-sm items-end md:items-start text-right">
            <div className="font-medium w-full">Organization Admin:</div>
            <div className="text-muted-foreground w-full">
              {getUserDisplayName(organization.adminUser, "Not assigned")}
            </div>
            {organization.adminUser?.email && (
              <a href={`mailto:${organization.adminUser.email}`} className="text-primary text-sm hover:underline">
                {organization.adminUser.email}
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <Button
              onClick={async () => {
                const organizationFCUser = await utils.users.getById.fetch({
                  id: !!organization.fundraisingConsultantUserId
                    ? organization.fundraisingConsultantUserId
                    : organization.createdByUserId,
                })
                setSelectedOrgFCDetails(organizationFCUser)
                if (
                  !!organizationFCUser &&
                  organizationFCUser.role === RolesEnum.SALES_REPRESENTATIVE &&
                  (organizationFCUser.status === UsersStatusEnum.ACTIVE ||
                    organizationFCUser.status === UsersStatusEnum.PENDING)
                ) {
                  setSelectedOrganization({ ...organization, fundraisingConsultantUser: organizationFCUser })
                  posthog.capture("organization_sales_representative_details", {
                    organization_id: organization.id,
                    organization_name: organization.name,
                    sales_representative_name: organizationFCUser?.fullName,
                    sales_representative_email: organizationFCUser?.email,
                  })
                } else {
                  setSelectedOrganization({ ...organization, fundraisingConsultantUser: null })
                  posthog.capture("organization_sales_representative_details", {
                    organization_id: organization.id,
                    organization_name: organization.name,
                    sales_representative_name: "Unassigned",
                  })
                }
              }}
              variant="secondary"
            >
              <Settings />
              Organization Settings
            </Button>

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
          </div>
        </div>
      </div>

      <Separator />
    </>
  )
}

function OrganizationsHeaderLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start gap-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />
    </div>
  )
}
