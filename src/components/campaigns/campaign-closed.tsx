"use client"

import { BanknoteArrowDown, Megaphone } from "lucide-react"
import Image from "next/image"

import { NotFound } from "@/components/not-found"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { type Campaign, type Organization } from "@/server/db/schema"
import { api } from "@/trpc/react"

import { CampaignSummary, CloseCampaignHeader } from "./campaign-close"

interface CampaignClosedProps {
  campaign: Campaign
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
  onPayout: () => void
}

export function CampaignClosed({ campaign, organization, open, onOpenChange, onPayout }: CampaignClosedProps) {
  const { data: metrics } = api.campaigns.getHeaderMetrics.useQuery({ campaignId: campaign.id })

  if (!campaign || !organization) {
    return <NotFound />
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Fundraiser Closed"
      description="Fundraiser has ended successfully - review results and initiate payout"
      icon={Megaphone}
      iconClassName="text-red-500"
      className="max-w-[760px]"
    >
      <div className="flex flex-col items-center justify-center py-6">
        <Image
          src="/campaign-closed.png"
          alt="Fundraiser Close Confirmation"
          width={712}
          height={300}
          className="rounded-lg"
        />
      </div>
      <CloseCampaignHeader campaign={campaign} organization={organization} />
      <CampaignSummary metrics={metrics} campaign={campaign} />

      <div className="flex flex-row gap-4 mt-6 justify-end">
        <Button onClick={onPayout}>
          <BanknoteArrowDown />
          Payout Fundraiser
        </Button>
      </div>
    </Modal>
  )
}
