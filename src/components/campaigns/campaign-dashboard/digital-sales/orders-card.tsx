"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { DeliverOrderDialog, type DeliverOrderSummary } from "@/components/order-summary/deliver-order-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ANONYMOUS_BUYER_NAME, PaymentMethodEnum, PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import { api } from "@/trpc/react"

import { formatPackageLabel } from "./format-package-label"

interface OrdersCardProps {
  digitalSalesId: string
  campaignId: string
  userId: string
  participantFirstName: string
}

export function OrdersCard({ digitalSalesId, campaignId, userId, participantFirstName }: OrdersCardProps) {
  const router = useRouter()
  const [selectedOrder, setSelectedOrder] = useState<DeliverOrderSummary | null>(null)

  const { data, isLoading } = api.consumerPaymentLogs.getPendingOrdersSummaryByDigitalSalesId.useQuery(
    { digitalSalesId },
    { enabled: !!digitalSalesId }
  )

  const pendingCount = data?.pendingCount ?? 0
  const latestOrders = data?.latestOrders ?? []

  const goToOrderSummary = () => router.push(`/dashboard/campaigns/${campaignId}/order-summary?userId=${userId}`)

  if (isLoading) return null

  return (
    <Card>
      <CardContent className="space-y-1.5 p-[14px]">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Orders</span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              {pendingCount} pending
            </span>
          )}
        </div>

        {latestOrders.length === 0 ? (
          <div className="py-2 text-center text-xs text-muted-foreground">All orders delivered</div>
        ) : (
          latestOrders.map(order => {
            const isDueInCash =
              order.paymentMethod === PaymentMethodEnum.CASH && order.paymentStatus === PaymentStatusEnum.PENDING

            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {order.buyerName ?? ANONYMOUS_BUYER_NAME}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPackageLabel(order.packageLabel, order.barsQuantity)}
                  </div>
                  {isDueInCash && <div className="text-xs font-semibold text-warning">Due in cash</div>}
                </div>

                <Button size="sm" variant="success" onClick={() => setSelectedOrder(order)}>
                  Deliver
                </Button>
              </div>
            )
          })
        )}

        <Button variant="secondary" className="mt-1 w-full" onClick={goToOrderSummary}>
          View details
        </Button>
      </CardContent>

      {selectedOrder && (
        <DeliverOrderDialog
          order={selectedOrder}
          open
          onOpenChange={open => {
            if (!open) setSelectedOrder(null)
          }}
          participantId={userId}
          fundraiserId={campaignId}
          participantFirstName={participantFirstName}
        />
      )}
    </Card>
  )
}
