"use client"

import { Banknote, CircleCheckBig } from "lucide-react"
import { useRouter } from "next/navigation"

import { formatPackageLabel } from "@/components/campaigns/campaign-dashboard/digital-sales/format-package-label"
import { Button } from "@/components/ui/button"
import { type ConsumerOrderDetails, PaymentMethodEnum } from "@/constants/consumer-payment-logs"
import { formatCentsToCurrency } from "@/utils/money"

interface OrderConfirmationProps {
  shopId: string
  firstName: string
  order: {
    id: string
    orderDetails: ConsumerOrderDetails
    barsQuantity: number
    amountCents: number
    paymentMethod: string | null
    paymentStatus: string | null
    orderStatus: string
  }
  consumer: {
    email: string
  }
}

export function OrderConfirmation({ shopId, firstName, order, consumer }: OrderConfirmationProps) {
  const router = useRouter()

  const { orderDetails } = order

  const buyerName = orderDetails.name.trim() || "friend"

  const isCard = order.paymentMethod === PaymentMethodEnum.CARD

  const deliveryAddress = orderDetails.address?.trim()
  const specialRequest = orderDetails.preferences?.trim()
  const hasDetails = !!deliveryAddress || !!specialRequest

  const detailsRows = (
    <div className="space-y-3">
      {!!deliveryAddress && (
        <div className="flex items-baseline justify-between gap-4">
          <p className="shrink-0 text-[13.5px] text-muted-foreground">Address</p>
          <p className="whitespace-pre-wrap break-words text-right text-[13.5px] font-medium text-primary">
            {deliveryAddress}
          </p>
        </div>
      )}

      {!!specialRequest && (
        <div className="flex items-baseline justify-between gap-4">
          <p className="shrink-0 text-[13.5px] text-muted-foreground">Special Request</p>
          <p className="whitespace-pre-wrap break-words text-right text-[13.5px] font-medium text-primary">
            {specialRequest}
          </p>
        </div>
      )}
    </div>
  )

  if (isCard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-[#16a34a] px-5 py-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <CircleCheckBig className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold">Order confirmed, {buyerName}!</h1>
          <p className="mt-1 text-sm">Payment received. We&apos;ll be in touch soon.</p>
        </div>

        <div className="mx-auto w-full max-w-4xl space-y-[10px] p-[14px]">
          <div className="rounded-card border bg-card p-5 shadow-sm">
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Your order</p>

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="text-[13.5px] text-primary">
                {formatPackageLabel(orderDetails.packageLabel, order.barsQuantity)}
              </p>

              <p className="text-[13.5px] font-medium text-primary">{formatCentsToCurrency(order.amountCents)}</p>
            </div>

            <hr className="my-4 border-border" />

            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[17px] font-bold text-primary">Total paid</p>
              <p className="text-[24px] font-bold text-[#16a34a]">{formatCentsToCurrency(order.amountCents)}</p>
            </div>

            {hasDetails && (
              <>
                <hr className="my-4 border-border" />
                {detailsRows}
              </>
            )}
          </div>

          <div className="rounded-card border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f9e4b7] text-[22px]">
                🐱
              </div>

              <div>
                <div className="text-sm font-medium text-primary">In-person delivery</div>
                <div className="mt-0.5 text-xs text-muted-foreground">We&apos;ll reach out to arrange delivery.</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-[#eaf7ec] px-3 py-2.5 text-xs text-[#15803d]">
              <span>
                Receipt sent to <strong>{consumer.email}</strong>
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/shop/${shopId}`)}
            className="mx-auto flex h-11 items-center justify-center gap-2 hover:bg-transparent text-base"
          >
            Back to {firstName}&apos;s page
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Powered by WFCentral · World&apos;s Finest Chocolate
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-[#d97706] px-5 py-7 text-center text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
          <Banknote className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold">Order placed, {buyerName}!</h1>

        <p className="mt-1 text-sm">Pay cash when {firstName} delivers</p>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-[10px] p-[14px]">
        <div className="rounded-card border bg-card p-5 shadow-sm">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Your order</p>

          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="text-[13.5px] text-primary">
              {formatPackageLabel(orderDetails.packageLabel, order.barsQuantity)}
            </p>

            <p className="text-[13.5px] font-medium text-primary">{formatCentsToCurrency(order.amountCents)}</p>
          </div>

          <hr className="my-4 border-border" />

          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[17px] font-bold text-primary">Due in cash</p>

            <p className="text-[24px] font-bold text-[#d97706]">{formatCentsToCurrency(order.amountCents)}</p>
          </div>

          {hasDetails && (
            <>
              <hr className="my-4 border-border" />
              {detailsRows}
            </>
          )}
        </div>

        <div className="rounded-card border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f9e4b7] text-[22px]">
              🐱
            </div>

            <div>
              <div className="text-sm font-medium text-primary">In-person delivery</div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                Have cash ready — the order will be marked paid once it&apos;s collected.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-[#fff4dc] px-3 py-2.5 text-xs text-[#8a5a00]">
            <span>
              Order confirmation sent to <strong>{consumer.email}</strong>
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/shop/${shopId}`)}
          className="mx-auto flex h-11 items-center justify-center gap-2 hover:bg-transparent text-base"
        >
          Back to {firstName}&apos;s page
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Powered by WFCentral · World&apos;s Finest Chocolate
        </p>
      </div>
    </div>
  )
}
