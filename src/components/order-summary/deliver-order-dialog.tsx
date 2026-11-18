"use client"

import { ChevronLeft } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  ANONYMOUS_BUYER_NAME,
  DELIVERY_NOTIFICATION_MAX_LENGTH,
  formatDeliveryNotification,
} from "@/constants/consumer-payment-logs"
import { useIsMobile } from "@/hooks"
import { api } from "@/trpc/react"
import { formatCentsToCurrency } from "@/utils/money"

import { formatPackageLabel } from "../campaigns/campaign-dashboard/digital-sales/format-package-label"

export interface DeliverOrderSummary {
  id: string
  buyerName: string | null
  packageLabel: string
  barsQuantity: number
  amountCents: number
}

interface DeliverOrderDialogProps {
  order: DeliverOrderSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  participantId: string
  fundraiserId: string
  participantFirstName: string
  onDelivered?: () => void
}

const TITLE = "Mark as delivered"
const DESCRIPTION = "Confirm delivery — the buyer will be notified."

export function DeliverOrderDialog({
  order,
  open,
  onOpenChange,
  participantId,
  fundraiserId,
  participantFirstName,
  onDelivered,
}: DeliverOrderDialogProps) {
  const isMobile = useIsMobile()
  const utils = api.useUtils()
  const queryInput = { participantId, fundraiserId }
  const buyerName = order.buyerName ?? ANONYMOUS_BUYER_NAME

  const [message, setMessage] = useState(() => formatDeliveryNotification(order.buyerName, participantFirstName))

  const markDelivered = api.consumerPaymentLogs.markDelivered.useMutation({
    onSuccess: async updated => {
      await Promise.all([
        utils.consumerPaymentLogs.getOrders.invalidate(queryInput),
        utils.consumerPaymentLogs.getPendingOrdersSummaryByDigitalSalesId.invalidate({
          digitalSalesId: updated.digitalSalesId,
        }),
        utils.consumerPaymentLogs.getOrderSummaryByDigitalSalesId.invalidate({
          digitalSalesId: updated.digitalSalesId,
        }),
        utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate(queryInput),
      ])
      onOpenChange(false)
      onDelivered?.()
      toast.success(`${buyerName} marked as delivered`)
    },
    onError: error => toast.error(error.message || "Could not mark this order as delivered"),
  })

  const trimmedMessage = message.trim()
  const canConfirm = trimmedMessage.length > 0 && !markDelivered.isPending

  const body = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-base font-semibold text-foreground">{`Deliver — ${buyerName}`}</div>
        <p className="mt-1 text-sm text-muted-foreground">{DESCRIPTION}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-control border bg-[#fbf6eb] p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Package</span>
          <span className="font-semibold text-foreground">
            {formatPackageLabel(order.packageLabel, order.barsQuantity)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className="text-muted-foreground">Total paid</span>
          <span className="font-semibold text-foreground">{formatCentsToCurrency(order.amountCents)}</span>
        </div>
      </div>

      <div className="rounded-r-control border-l-4 border-green-600 bg-creamy-50 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Notification to buyer</span>
          <span className="text-[11px] text-muted-foreground">
            {message.length} / {DELIVERY_NOTIFICATION_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          value={message}
          onChange={event => setMessage(event.target.value)}
          maxLength={DELIVERY_NOTIFICATION_MAX_LENGTH}
          disabled={markDelivered.isPending}
          rows={3}
          spellCheck={false}
          className="border-none bg-transparent p-0 text-sm italic text-muted-foreground shadow-none focus-visible:border-none focus-visible:ring-0"
        />
      </div>

      <Button
        variant="success"
        className="w-full"
        disabled={!canConfirm}
        onClick={() => markDelivered.mutate({ ...queryInput, consumerPaymentLogId: order.id, message: trimmedMessage })}
      >
        {markDelivered.isPending ? "Marking as delivered..." : "Yes, mark as delivered"}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={markDelivered.isPending}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <div className="fixed inset-x-0 top-0 z-[60] flex items-center gap-3 border-b bg-creamy-50 px-[18px] py-[13px]">
          <button
            type="button"
            aria-label="Back"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-[17px] font-semibold text-foreground">{TITLE}</span>
        </div>

        <SheetContent
          side="bottom"
          className="rounded-t-2xl bg-card"
          showCloseButton={false}
          onPointerDownOutside={event => event.preventDefault()}
          onEscapeKeyDown={event => event.preventDefault()}
        >
          <SheetTitle className="sr-only">{TITLE}</SheetTitle>
          <div className="mx-auto h-1 w-9 rounded-full bg-[#dfd0b3]" />
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={TITLE} className="bg-card" preventOutsideClose>
      {body}
    </Modal>
  )
}
