"use client"

import { Box, MailIcon, MapPinHouseIcon, PhoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ANONYMOUS_BUYER_NAME,
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  PreferredContactMethodEnum,
} from "@/constants/consumer-payment-logs"
import type { OrderSummaryListItem } from "@/server/services/consumer-payment-logs"
import { formatRelativeTime } from "@/utils/date"
import { formatPhoneNumberWithCallingCode } from "@/utils/phone"

import { formatPackageLabel } from "../campaigns/campaign-dashboard/digital-sales/format-package-label"

const CHIP_CLASS = "rounded-chip bg-background font-normal hover:bg-background"

const formatCents = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })

interface OrderCardProps {
  order: OrderSummaryListItem
  onDeliver?: (consumerPaymentLogId: string) => void
  isBusy?: boolean
}

export function OrderCard({ order, onDeliver, isBusy }: OrderCardProps) {
  const isDelivered = order.orderStatus === OrderStatusEnum.DELIVERED
  const isRequest = order.orderStatus === OrderStatusEnum.REQUESTED
  const isCash = order.paymentMethod === PaymentMethodEnum.CASH
  const isPaid = order.paymentStatus === PaymentStatusEnum.PAID
  const awaitingCash = isCash && !isPaid

  const paymentLabel = order.paymentMethod ? (isCash ? "Cash" : "Card") : null

  return (
    <div className="rounded-card border bg-card p-3.5 shadow-elev-1">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{order.buyerName ?? ANONYMOUS_BUYER_NAME}</div>
        </div>
        <PaymentStatusBlock
          isPaid={isPaid}
          paidAt={order.paidAt}
          placedAt={order.placedAt}
          awaitingCash={awaitingCash}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className={CHIP_CLASS}>
          {formatPackageLabel(order.packageLabel, order.barsQuantity)}
        </Badge>
        {paymentLabel && (
          <Badge variant="secondary" className={CHIP_CLASS}>
            {paymentLabel}
          </Badge>
        )}
      </div>

      <div className="mt-3 mb-2.5 truncate flex flex-wrap pl-2.5 text-xs text-muted-foreground">
        <div className="mt-[1px]">
          <MailIcon size={12} />
        </div>
        &nbsp; {order.email} &nbsp;
        {order.preferredContactMethod === PreferredContactMethodEnum.EMAIL && (
          <span className="inline-flex shrink-0 items-center gap-1 -mt-[2px] rounded-full px-2 py-0.5 text-[9px] font-bold bg-muted-foreground/10 text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
            Preferred Contact
          </span>
        )}
      </div>
      <div className="mb-2.5 truncate flex flex-wrap pl-2.5 text-xs text-muted-foreground">
        <PhoneIcon size={12} />
        &nbsp; {formatPhoneNumberWithCallingCode(order.phoneNumber)} &nbsp;
        {order.preferredContactMethod === PreferredContactMethodEnum.PHONE && (
          <span className="inline-flex shrink-0 items-center gap-1 -mt-[2px] rounded-full px-2 py-0.5 text-[9px] font-bold bg-muted-foreground/10 text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
            Preferred Contact
          </span>
        )}
      </div>

      {!!order.address && (
        <div className="mb-2.5 flex flex-wrap truncate pl-2.5 text-xs text-muted-foreground">
          <MapPinHouseIcon size={12} />
          &nbsp; {order.address}
        </div>
      )}

      {!!order.preferences && (
        <div className="mb-2.5 flex flex-wrap truncate pl-2.5 text-xs text-muted-foreground">
          <div className="mt-[1px]">
            <Box size={12} />
          </div>
          &nbsp; Preferences : {order.preferences}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">{formatCents(order.amountCents)}</div>

        {isDelivered ? (
          <div className="text-right">
            <div className="text-xs font-semibold text-success">Delivered</div>
            {order.deliveredAt && (
              <div className="text-[10px] text-[#bda898]">{formatRelativeTime(order.deliveredAt)}</div>
            )}
          </div>
        ) : isRequest ? null : (
          <Button variant="success" disabled={isBusy} onClick={() => onDeliver?.(order.id)}>
            Deliver
          </Button>
        )}
      </div>
    </div>
  )
}

function PaymentStatusBlock({
  isPaid,
  paidAt,
  placedAt,
  awaitingCash,
}: {
  isPaid: boolean
  paidAt: Date | null
  placedAt: Date
  awaitingCash: boolean
}) {
  if (isPaid) {
    return (
      <div className="shrink-0 text-right">
        <div className="text-xs font-semibold text-success">Paid</div>
        {paidAt && (
          <div className="text-[10px] text-[#bda898] first-letter:uppercase">{formatRelativeTime(paidAt)}</div>
        )}
      </div>
    )
  }

  return (
    <div className="shrink-0 text-right">
      <div className="text-xs font-semibold text-warning">{awaitingCash ? "Due in cash" : "Pending"}</div>
      <div className="text-[10px] text-[#bda898] first-letter:uppercase">{formatRelativeTime(placedAt)}</div>
    </div>
  )
}
