"use client"

import { CircleDollarSign } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"
import { formatCentsToCurrency } from "@/utils/money"

interface CampaignMetricsPaymentsCardProps {
  totalPaymentCollectedCents: number
  totalPaymentExpectedCents: number
}

export function CampaignMetricsPaymentsCard({
  totalPaymentCollectedCents,
  totalPaymentExpectedCents,
}: CampaignMetricsPaymentsCardProps) {
  return (
    <MetricCard
      title="Payment Collected"
      icon={CircleDollarSign}
      value={totalPaymentCollectedCents}
      goal={totalPaymentExpectedCents}
      goalDescriptionText="Collected / Expected:"
      goalDescriptionValue={`${formatCentsToCurrency(totalPaymentCollectedCents)} / ${formatCentsToCurrency(totalPaymentExpectedCents)}`}
      color={ColorEnum.GREEN}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Payments collected by participants</p>
          <hr />
          <p>
            Divided by the campaign&apos;s expected payment amount
            <br />
            <span className="text-muted-foreground">(number of cases delivered * price per case)</span>
          </p>
        </div>
      }
    />
  )
}
