"use client"

import { Archive, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { CampaignsActions } from "@/components/campaigns"
import { type NewButtonProps } from "@/components/data-table"
import { NotFound } from "@/components/not-found"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { WithTooltip } from "@/components/ui/tooltip"
import { CAMPAIGN_STATUS_DETAILS, CampaignsStatusEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatDate } from "@/utils/date"

import { CampaignClose } from "./campaign-close"
import { CampaignClosed } from "./campaign-closed"
import { CampaignPayout } from "./campaign-payout"
import { CampaignsPayoutButton } from "./campaigns-payout-button"
import { CampaignsSummaryDownload } from "./campaigns-summary-download"

interface CampaignsHeaderProps {
  campaignId: string
  organizationId: string
  goBackHref?: string
  ctaButton?: NewButtonProps
  hideSettingsButton?: boolean
}

export function CampaignsHeader({
  campaignId,
  organizationId,
  goBackHref,
  ctaButton,
  hideSettingsButton = false,
}: CampaignsHeaderProps) {
  const [updateCampaign, setUpdateCampaign] = useState<Campaign | null>(null)
  const [closeCampaign, setCloseCampaign] = useState<Campaign | null>(null)
  const [openPayout, setOpenPayout] = useState<boolean>(false)
  const [openCampaignClosed, setOpenCampaignClosed] = useState<boolean>(false)

  const { data: campaign, isLoading: isCampaignLoading } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data: organization, isLoading: isOrganizationLoading } = api.organizations.getById.useQuery({
    id: organizationId,
  })
  const { loggedInRole: role, isLoading: isUserLoading } = useLoggedInUser()

  const canCloseCampaign =
    role &&
    [RolesEnum.ADMIN, RolesEnum.WFC_ADMIN, RolesEnum.SALES_MANAGER, RolesEnum.SALES_REPRESENTATIVE].includes(role)

  const canPayoutCampaign = role && [RolesEnum.ADMIN, RolesEnum.ORGANIZATION_ADMIN].includes(role)

  useEffect(() => {
    if (campaign?.status === CampaignsStatusEnum.ENDED && canPayoutCampaign) {
      setOpenCampaignClosed(true)
    }
  }, [canPayoutCampaign, campaign])

  if (isCampaignLoading || isOrganizationLoading || isUserLoading) {
    return <CampaignsHeaderLoading />
  }

  if (!campaign || !role || !organization) {
    return <NotFound />
  }

  const campaignIsActive = (campaign.status as CampaignsStatusEnum) === CampaignsStatusEnum.ACTIVE
  const campaignIsEnded = (campaign.status as CampaignsStatusEnum) === CampaignsStatusEnum.ENDED

  const campaignStatusLabel = CAMPAIGN_STATUS_DETAILS[campaign.status as CampaignsStatusEnum].label

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:flex-wrap justify-between items-center gap-2">
          <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-0 md:flex-[1_1_12rem]">
            <h2 className="flex items-center gap-2 text-2xl font-semibold first-letter:uppercase">
              {goBackHref && (
                <WithTooltip
                  content="Go back to the organization"
                  side="top"
                  trigger={
                    <Link href={goBackHref}>
                      <ArrowLeft className="w-5 h-5 cursor-pointer" />
                    </Link>
                  }
                />
              )}
              {campaign?.name}
            </h2>
            <div className="first-letter:uppercase">
              {organization?.name ?? ""} • {organization?.city}, {organization?.state}
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-2 text-sm md:justify-end">
            {ctaButton && (
              <Button onClick={ctaButton.onClick}>
                {ctaButton.icon && <ctaButton.icon />}
                {ctaButton.text}
              </Button>
            )}

            {!hideSettingsButton && (
              <Button variant="secondary" onClick={() => setUpdateCampaign(campaign)}>
                <Settings />
                Fundraiser Settings
              </Button>
            )}

            {campaignIsEnded && <CampaignsSummaryDownload campaign={campaign} />}

            {canCloseCampaign && (
              <Button variant="destructive" onClick={() => setCloseCampaign(campaign)} disabled={!campaignIsActive}>
                <Archive />
                {campaignIsActive ? "Close Fundraiser" : "Fundraiser Closed"}
              </Button>
            )}

            {canPayoutCampaign && (
              <CampaignsPayoutButton campaign={campaign} organization={organization} onOpenChange={setOpenPayout} />
            )}

            <CampaignClosed
              campaign={campaign}
              organization={organization}
              open={openCampaignClosed}
              onOpenChange={setOpenCampaignClosed}
              onPayout={() => {
                setOpenPayout(true)
                setOpenCampaignClosed(false)
              }}
            />

            {updateCampaign && (
              <CampaignsActions
                organizationId={organizationId}
                campaign={updateCampaign}
                open={!!updateCampaign}
                onOpenChange={() => setUpdateCampaign(null)}
              />
            )}
            {closeCampaign && organization && (
              <CampaignClose
                campaign={closeCampaign}
                organization={organization}
                open={!!closeCampaign}
                onOpenChange={() => setCloseCampaign(null)}
              />
            )}
            {openPayout && organization && (
              <CampaignPayout
                campaign={campaign}
                organization={organization}
                open={openPayout}
                onOpenChange={setOpenPayout}
              />
            )}
          </div>
        </div>

        <div className="flex flex-row text-sm items-center gap-4 md:justify-end">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(campaign.startDate, { month: "short" })} - {formatDate(campaign.endDate, { month: "short" })}
          </div>
          <Badge className={cn(campaignIsEnded && "bg-teal-600")}>{campaignStatusLabel}</Badge>
        </div>
      </div>

      <Separator />
    </>
  )
}

function CampaignsHeaderLoading() {
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
