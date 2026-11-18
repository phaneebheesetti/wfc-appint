"use client"

import { Box } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"
import { env } from "@/env"

interface CampaignMetricsCasesCardProps {
  totalCasesCheckedOut: number
  totalCasesDelivered: number
}

export function CampaignMetricsCasesCard({ totalCasesCheckedOut, totalCasesDelivered }: CampaignMetricsCasesCardProps) {
  return (
    <MetricCard
      title="Cases Checked Out"
      icon={Box}
      value={totalCasesCheckedOut}
      goal={totalCasesDelivered}
      goalDescriptionText="Checked Out / Delivered:"
      goalDescriptionValue={`${totalCasesCheckedOut} / ${totalCasesDelivered}`}
      color={ColorEnum.ORANGE}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Cases checked out by participants</p>
          <hr />
          <p>
            Divided by the cases delivered to inventory
            {env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true" && ", minus any inventory adjustments"}.
          </p>
        </div>
      }
    />
  )
}
