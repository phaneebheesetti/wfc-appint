"use client"

import { Box, ChartNoAxesCombined, CircleDollarSign, FileText, Mails, Trophy, Users } from "lucide-react"
import { useParams } from "next/navigation"
import posthog from "posthog-js"
import { useEffect } from "react"

import { AnalyticsCampaigns } from "@/components/analytics"
import {
  CampaignInventoryAlert,
  CampaignLeaderboard,
  CampaignsHeader,
  CampaignsHeaderCards,
} from "@/components/campaigns"
import { CampaignsUsersList } from "@/components/campaigns-users"
import { CampaignAnnouncementsList } from "@/components/campaigns/campaign-announcements"
import { CasesTransactionsList } from "@/components/cases-transactions"
import { DocumentsList } from "@/components/documents"
import { EventsList } from "@/components/events"
import { NotFound } from "@/components/not-found"
import { PaymentLogsList } from "@/components/payment-logs"
import { PrizesList } from "@/components/prizes"
import { type Tab, TabsWithHash } from "@/components/ui/tabs"
import { CAMPAIGN_STATUS_DETAILS, CampaignsStatusEnum } from "@/constants/campaigns"
import { getPrizeTemplateName } from "@/constants/prize-templates"
import { RolesEnum } from "@/constants/roles"
import { api } from "@/trpc/react"

function deriveCampaignPhase(campaign: { status: string; startDate: Date; endDate: Date }, totalParticipants: number) {
  if (campaign.status === CampaignsStatusEnum.CANCELLED) return "cancelled"
  const now = new Date()
  if (now < campaign.startDate) return "Setup"
  if (now > campaign.endDate || campaign.status === CampaignsStatusEnum.ENDED) return "Completed"
  if (totalParticipants === 0) return "Inactive"
  return "Active"
}

function booleanToText(flag: boolean) {
  if (!!flag) return "Yes"
  else return "No"
}

function formatDateForAnalytics(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
}

interface CampaignPosthogData {
  organization_id: string
  campaign_id: string
  campaign_name: string
  campaign_prize_program_status: string
  campaign_status: string
  campaign_startDate: string
  campaign_endDate: string
  campaign_digital_payment_enabled: string
  campaign_digital_permissionslip_enabled: string
  campaign_homerunprizes_template_enabled: string
  campaign_homerunprizes_template_name?: string
}

export default function CampaignPage() {
  const { campaignId, organizationId } = useParams<{ campaignId: string; organizationId: string }>()
  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data: metrics } = api.campaigns.getHeaderMetrics.useQuery({ campaignId })

  const campaignIsActive = campaign?.status === CampaignsStatusEnum.ACTIVE
  const campaignHasDigitalPayment = !!campaign?.digitalPayment

  useEffect(() => {
    if (!campaign || !metrics) return
    let campaignData: CampaignPosthogData = {
      organization_id: campaign.organizationId,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      campaign_prize_program_status: CAMPAIGN_STATUS_DETAILS[campaign.status as CampaignsStatusEnum].label,
      campaign_status: deriveCampaignPhase(campaign, metrics.totalParticipants ?? 0),
      campaign_startDate: formatDateForAnalytics(campaign.startDate),
      campaign_endDate: formatDateForAnalytics(campaign.endDate),
      campaign_digital_payment_enabled: booleanToText(campaignHasDigitalPayment),
      campaign_digital_permissionslip_enabled: booleanToText(campaign.digitalPermissionSlip),
      campaign_homerunprizes_template_enabled: booleanToText(campaign.homeRunPrizesTemplate),
    }
    if (campaignData.campaign_homerunprizes_template_enabled === "Yes") {
      campaignData = {
        ...campaignData,
        campaign_homerunprizes_template_name: getPrizeTemplateName(campaign.prizeTemplateSlug) ?? "",
      }
    }
    posthog.capture("campaign_details", campaignData)
  }, [campaign, metrics, campaignHasDigitalPayment])

  if (!campaignId || !organizationId) {
    return <NotFound />
  }

  const tabs: Tab[] = [
    {
      label: "Participants",
      value: "participants",
      content: (
        <CampaignsUsersList
          campaignId={campaignId}
          organizationId={organizationId}
          campaignIsActive={campaignIsActive}
          campaignHasDigitalPayment={campaignHasDigitalPayment}
        />
      ),
      roles: [
        RolesEnum.ADMIN,
        RolesEnum.WFC_ADMIN,
        RolesEnum.ORGANIZATION_ADMIN,
        RolesEnum.ORGANIZATION_STAFF,
        RolesEnum.SALES_REPRESENTATIVE,
      ],
      icon: Users,
    },
    {
      label: "Communications",
      value: "messaging",
      content: (
        <CampaignAnnouncementsList
          campaignId={campaignId}
          organizationId={organizationId}
          campaignIsActive={campaignIsActive}
        />
      ),
      roles: [
        RolesEnum.ADMIN,
        RolesEnum.WFC_ADMIN,
        RolesEnum.ORGANIZATION_ADMIN,
        RolesEnum.ORGANIZATION_STAFF,
        RolesEnum.SALES_REPRESENTATIVE,
      ],
      icon: Mails,
    },
    {
      label: "Transactions",
      value: "transactions",
      content: (
        <PaymentLogsList campaignId={campaignId} organizationId={organizationId} campaignIsActive={campaignIsActive} />
      ),
      icon: CircleDollarSign,
    },
    {
      label: "Inventory",
      value: "inventory",
      content: (
        <CasesTransactionsList
          campaignId={campaignId}
          organizationId={organizationId}
          campaignIsActive={campaignIsActive}
        />
      ),
      icon: Box,
    },
    {
      label: "Analytics",
      value: "analytics",
      content: (
        <div className="flex flex-col gap-4">
          <AnalyticsCampaigns campaignId={campaignId} />
          <CampaignLeaderboard campaignId={campaignId} />
        </div>
      ),
      icon: ChartNoAxesCombined,
    },
    {
      label: "Prizes & Events",
      value: "prizes",
      content: (
        <div className="flex flex-col gap-4">
          <PrizesList organizationId={organizationId} campaignId={campaignId} campaignIsActive={campaignIsActive} />
          <EventsList organizationId={organizationId} campaignId={campaignId} campaignIsActive={campaignIsActive} />
        </div>
      ),
      icon: Trophy,
    },
    {
      label: "Permission Slips",
      value: "documents",
      content: <DocumentsList organizationId={organizationId} campaignId={campaignId} />,
      icon: FileText,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <CampaignsHeader
        campaignId={campaignId}
        organizationId={organizationId}
        goBackHref={`/dashboard/organizations/${organizationId}`}
      />
      <CampaignsHeaderCards campaignId={campaignId} />

      <CampaignInventoryAlert campaignId={campaignId} />

      <TabsWithHash tabs={tabs} tabsListClassName="overflow-x-auto overflow-y-hidden" />
    </div>
  )
}
