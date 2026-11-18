"use client"

import { ConnectPayouts } from "@stripe/react-connect-js"
import { Megaphone } from "lucide-react"

import { NotFound } from "@/components/not-found"
import { StripeConnectButton } from "@/components/stripe-connect"
import { Modal } from "@/components/ui/modal"
import { StripeConnectProvider } from "@/providers"
import { type Campaign, type Organization } from "@/server/db/schema"

import { CloseCampaignHeader } from "./campaign-close"

interface CampaignPayoutProps {
  campaign: Campaign
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignPayout({ campaign, organization, open, onOpenChange }: CampaignPayoutProps) {
  if (!campaign || !organization) {
    return <NotFound />
  }

  const connectedAccountId = organization.stripeConnectedAccountId

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payout Fundraiser"
      description="Payout fundraiser after it has been closed"
      icon={Megaphone}
      iconClassName="text-green-500"
      className="max-w-[760px]"
    >
      <CloseCampaignHeader campaign={campaign} organization={organization} />

      {!connectedAccountId && <StripeConnectButton organizationId={organization.id} />}

      {connectedAccountId && (
        <StripeConnectProvider stripeAccountId={connectedAccountId} enablePayouts={true}>
          <ConnectPayouts />
        </StripeConnectProvider>
      )}
    </Modal>
  )
}
