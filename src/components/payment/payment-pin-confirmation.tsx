"use client"

import { useState } from "react"

import { type CampaignOption, type ValidatedPinWithCampaigns } from "@/components/payment/payment-pin-form"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

export interface ValidatedPinWithSelectedCampaign {
  userId: string
  campaign: CampaignOption
  pin: string
}

interface PaymentPinConfirmationProps {
  onConfirmedByUser: (validatedPinWithSelectedCampaign: ValidatedPinWithSelectedCampaign) => void
  onConfirmationCancelled: () => void
  validatedPinWithCampaigns: ValidatedPinWithCampaigns
}

export function PaymentPinConfirmation({
  onConfirmedByUser,
  onConfirmationCancelled,
  validatedPinWithCampaigns,
}: PaymentPinConfirmationProps) {
  const campaigns = validatedPinWithCampaigns.campaigns

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    campaigns.length === 1 ? (campaigns[0]?.campaignId ?? null) : null
  )

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
  }

  const handleSelectCampaign = () => {
    const selectedCampaign = campaigns.find(campaign => campaign.campaignId === selectedCampaignId)

    if (selectedCampaign) {
      onConfirmedByUser({
        userId: validatedPinWithCampaigns.userId,
        campaign: selectedCampaign,
        pin: validatedPinWithCampaigns.pin,
      })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 text-left w-full">
        <div className="text-base font-semibold">Confirm Organization Fundraiser:</div>
        <div className="flex flex-col gap-2">
          {campaigns.map(campaign => {
            return (
              <div
                key={campaign.campaignId}
                className={cn(
                  "flex flex-col gap-1 flex-1 border rounded-control px-4 py-2 cursor-pointer text-sm",
                  selectedCampaignId === campaign.campaignId && "border-black border-2 cursor-auto"
                )}
                onClick={() => handleCampaignSelect(campaign.campaignId)}
              >
                <div className="font-medium">{campaign.organizationName}</div>
                <div>{campaign.campaignName}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="w-full flex gap-4">
        <Button onClick={handleSelectCampaign} disabled={!selectedCampaignId}>
          Next
        </Button>
        <Button variant="secondary" onClick={onConfirmationCancelled}>
          Cancel
        </Button>
      </div>
    </>
  )
}
