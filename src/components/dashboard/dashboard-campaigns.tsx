"use client"

import { Megaphone } from "lucide-react"
import { useMemo, useState } from "react"

import { CampaignPayout } from "@/components/campaigns/campaign-payout"
import { campaignsListColumns } from "@/components/campaigns/campaigns-list-columns"
import { CampaignsPayoutButton } from "@/components/campaigns/campaigns-payout-button"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import type { Campaign, Organization } from "@/server/db/schema"
import { api } from "@/trpc/react"

import { DashboardLatestCampaign } from "./dashboard-last-campaign"
import { DashboardSales } from "./dashboard-sales"
import { DashboardWelcome } from "./dashboard-welcome"

export function DashboardCampaigns() {
  const { loggedInRole: role, loggedInUserId } = useLoggedInUser()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [openPayout, setOpenPayout] = useState<boolean>(false)

  const { data: campaigns, isLoading } = api.campaigns.getCampaignsByUserId.useQuery(
    { userId: loggedInUserId ?? "", role: role },
    { enabled: !!loggedInUserId }
  )
  const filteredCampaigns = useMemo(() => {
    return campaigns?.filter(campaign => !campaign.deletedAt && !campaign.organization.deletedAt)
  }, [campaigns])

  const latestCampaign = useMemo(() => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) return null

    return filteredCampaigns.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]
  }, [filteredCampaigns])

  const canPayout = role === RolesEnum.ORGANIZATION_ADMIN

  const columns = useMemo(
    () => [
      ...campaignsListColumns({}),
      {
        id: "payout",
        cell: ({ row }) => {
          const campaignStatus = row.original.status as CampaignsStatusEnum

          if (campaignStatus === CampaignsStatusEnum.ENDED) {
            const organization = row.original.organization
            if (!organization) {
              return null
            }

            return (
              <CampaignsPayoutButton
                campaign={row.original}
                organization={organization}
                buttonVariant="outline"
                label="Payout"
                onOpenChange={() => {
                  openCampaignPayout(row.original, organization)
                }}
              />
            )
          }

          return (
            <Button variant="outline" disabled className="opacity-50">
              Payout
            </Button>
          )
        },
      },
    ],
    []
  )

  const openCampaignPayout = (campaign: Campaign, organization: Organization) => {
    setCampaign(campaign)
    setOrganization(organization)
    setOpenPayout(true)
  }

  if (
    !isLoading &&
    [RolesEnum.SALES_MANAGER, RolesEnum.SALES_REPRESENTATIVE].includes(role ?? RolesEnum.USER) &&
    (filteredCampaigns ?? []).length === 0
  ) {
    return (
      <DashboardWelcome>
        <DashboardSales />
      </DashboardWelcome>
    )
  }

  return (
    <div className="h-full w-full flex flex-col gap-4 items-center justify-start">
      <DashboardLatestCampaign campaign={latestCampaign} />

      <div className="text-xl font-medium text-left w-full">Your Fundraisers</div>

      <div className="w-full">
        <DataTable
          data={filteredCampaigns ?? []}
          emptyState={{
            title: "Your fundraisers will appear here",
            description: "",
            icon: Megaphone,
          }}
          loading={isLoading}
          columns={columns}
          hiddenColumns={canPayout ? [] : ["payout"]}
          multiColumnFilter={{
            columns: [{ accessorKey: "name", name: "Name" }],
          }}
        />
      </div>

      {openPayout && organization && campaign && (
        <CampaignPayout
          campaign={campaign}
          organization={organization}
          open={openPayout}
          onOpenChange={setOpenPayout}
        />
      )}
    </div>
  )
}
