"use client"

import { CreditCard } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"
import { formatCentsToCurrency } from "@/utils/money"

interface CampaignMetricsDigitalPaymentsShareCardProps {
  digitalPaymentsAmountCents: number
  digitalPaymentsPercentage: number
  totalPaymentsAmountCents: number
}

export function CampaignMetricsDigitalPaymentsShareCard({
  digitalPaymentsAmountCents,
  digitalPaymentsPercentage,
  totalPaymentsAmountCents,
}: CampaignMetricsDigitalPaymentsShareCardProps) {
  return (
    <MetricCard
      title="Digital Payments Share"
      icon={CreditCard}
      value={digitalPaymentsPercentage}
      goal={100}
      goalDescriptionText="Digital / Total:"
      goalDescriptionValue={`${formatCentsToCurrency(digitalPaymentsAmountCents)} / ${formatCentsToCurrency(totalPaymentsAmountCents)}`}
      color={ColorEnum.BLUE}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Digital payments</p>
          <hr />
          <p>Divided by the total payments (digital + cash)</p>
        </div>
      }
    />
  )
}
