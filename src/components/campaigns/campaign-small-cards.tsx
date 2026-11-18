"use client"

import { Box, CircleDollarSign, PackagePlus, Receipt } from "lucide-react"
import { useState } from "react"

import { ChocolateRequestParticipantsModal } from "@/components/campaigns/chocolate-request-participants-modal"
import { MetricCardSmall } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ColorEnum } from "@/constants/colors"
import { env } from "@/env"
import { api } from "@/trpc/react"

interface CampaignsSmallCardsProps {
  campaignId: string
}

export function CampaignsSmallCards({ campaignId }: CampaignsSmallCardsProps) {
  const { data: metrics, isLoading } = api.campaigns.getSmallCardsMetrics.useQuery({ campaignId })
  const [showChocolateRequestModal, setShowChocolateRequestModal] = useState(false)
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const totalCasesAdjusted = metrics?.totalCasesAdjusted ?? 0
  // Delivered cases minus inventory adjustments (the adjusted total is 0 when the feature flag is off)
  const adjustedCasesDelivered = Math.max((metrics?.totalCasesDelivered ?? 0) - totalCasesAdjusted, 0)

  if (isLoading) {
    return (
      <div className="flex gap-4 mb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-40" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 mb-4 flex-wrap">
      <MetricCardSmall
        className="min-h-0"
        title="Requests for Chocolate"
        icon={Box}
        value={metrics?.totalCasesCheckoutRequests ?? 0}
        color={ColorEnum.ORANGE}
        tooltip={<p>Number of pending requests for chocolate</p>}
        onViewDetails={() => setShowChocolateRequestModal(true)}
      />

      <MetricCardSmall
        className="min-h-0"
        title="Total Cases Delivered"
        icon={PackagePlus}
        value={metrics?.totalCasesDelivered ?? 0}
        description={
          isInventoryUpdatesEnabled && totalCasesAdjusted > 0 ? (
            <>
              <span className="font-semibold text-destructive">− {totalCasesAdjusted}</span> Inventory Adjustments
            </>
          ) : null
        }
        color={ColorEnum.GREEN}
      />

      <MetricCardSmall
        className="min-h-0"
        title="Cases Available for Check Out"
        icon={Box}
        value={metrics?.totalCasesAvailable ?? 0}
        description={`Total cases available: ${metrics?.totalCasesAvailable} / ${adjustedCasesDelivered}`}
        color={ColorEnum.ORANGE}
        tooltip={
          <p className="font-normal">
            Cases available = Cases delivered minus cases checked out by participants
            {isInventoryUpdatesEnabled && " and inventory adjustments"}
          </p>
        }
      />

      <MetricCardSmall
        className="min-h-0"
        title="Cases Checked Out Paid"
        icon={CircleDollarSign}
        value={metrics?.percentagePaid ?? 0}
        color={ColorEnum.GREEN}
        valueType="percent"
        tooltip={
          <div className="flex flex-col gap-2 font-normal">
            <p>
              Total payment owed by participants
              <br />
              (cases checked out * price per case)
            </p>
            <hr />
            <p>Divided by payments made by participants</p>
          </div>
        }
      />

      <MetricCardSmall
        className="min-h-0"
        title="Money Due"
        icon={Receipt}
        value={metrics?.totalMoneyDue ?? 0}
        color={ColorEnum.ORANGE}
        valueType="currency"
        tooltip={
          <div className="flex flex-col gap-2 font-normal max-w-[100px]">
            <p>
              Total payment owed by participants
              <br />
              (cases checked out * price per case)
            </p>
            <hr />
            <p>Minus payments made by participants</p>
          </div>
        }
      />

      <ChocolateRequestParticipantsModal
        campaignId={campaignId}
        open={showChocolateRequestModal}
        onOpenChange={setShowChocolateRequestModal}
      />
    </div>
  )
}
