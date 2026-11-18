import { useEffect, useState } from "react"

import { formatPackageLabel } from "@/components/campaigns/campaign-dashboard/digital-sales/format-package-label"
import { SHOP_ORDERS_PAYMENT_TYPE_DETAILS, ShopOrdersPaymentTypeEnum } from "@/constants/shop-orders"
import { cn } from "@/utils/cn"
import { formatCentsToCurrency } from "@/utils/money"

interface ShopOrderSummaryProps {
  receiptTo: string
  deliveryAddress?: string
  specialRequest?: string
  bars: number | undefined
  label: string | undefined
  totalPriceCents: number
  paymentValue: ShopOrdersPaymentTypeEnum | null
  digitalPaymentEnabled: boolean
  cardPaymentAvailable: boolean
  getPaymentType: (paymentType: ShopOrdersPaymentTypeEnum) => void
}

export function ShopOrderSummary({
  receiptTo,
  deliveryAddress,
  specialRequest,
  bars,
  label,
  totalPriceCents,
  paymentValue,
  digitalPaymentEnabled,
  cardPaymentAvailable,
  getPaymentType,
}: ShopOrderSummaryProps) {
  const [paymentType, setPaymentType] = useState<ShopOrdersPaymentTypeEnum | null>(paymentValue)

  useEffect(() => {
    setPaymentType(paymentValue)
  }, [paymentValue])

  const formattedTotal = formatCentsToCurrency(totalPriceCents)

  return (
    <div className="flex flex-col">
      <div className="rounded-card border bg-card p-5 shadow-elev-1">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Order summary</p>

        <div className="mt-4 flex items-baseline justify-between gap-4">
          <p className="text-[13.5px] text-primary">{label ? formatPackageLabel(label, bars ?? 0) : "0 bars"}</p>
          <p className="text-[13.5px] font-medium text-primary">{formattedTotal}</p>
        </div>

        <hr className="my-4 border-border" />

        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[17px] font-bold text-primary">Total</p>
          <p className="text-[22px] font-bold text-primary">{formattedTotal}</p>
        </div>

        <hr className="my-4 border-border" />

        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[13.5px] text-muted-foreground">Receipt to</p>
          <p className="break-all text-[13.5px] font-medium text-primary">{receiptTo}</p>
        </div>

        {!!deliveryAddress?.trim() && (
          <div className="mt-3 flex items-baseline justify-between gap-4">
            <p className="shrink-0 text-[13.5px] text-muted-foreground">Address</p>
            <p className="whitespace-pre-wrap break-words text-right text-[13.5px] font-medium text-primary">
              {deliveryAddress}
            </p>
          </div>
        )}

        {!!specialRequest?.trim() && (
          <div className="mt-3 flex items-baseline justify-between gap-4">
            <p className="shrink-0 text-[13.5px] text-muted-foreground">Special Request</p>
            <p className="whitespace-pre-wrap break-words text-right text-[13.5px] font-medium text-primary">
              {specialRequest}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-card border bg-card p-5 shadow-elev-1">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">How will you pay?</p>

        <div role="radiogroup" className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
          {Object.entries(SHOP_ORDERS_PAYMENT_TYPE_DETAILS)
            .filter(
              ([value]) => (digitalPaymentEnabled && cardPaymentAvailable) || value !== ShopOrdersPaymentTypeEnum.CARD
            )
            .map(([value, { label }]) => {
              const isSelected = paymentType === value

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setPaymentType(value as ShopOrdersPaymentTypeEnum)
                    getPaymentType(value as ShopOrdersPaymentTypeEnum)
                  }}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-control border text-[13.5px] font-medium transition-colors focus-visible:border-[1.5px] focus-visible:border-input-background-active focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card text-primary hover:bg-creamy-50"
                  )}
                >
                  {label}
                </button>
              )
            })}
        </div>

        {paymentType && (
          <p className="mt-4 text-[13.5px] text-primary">{SHOP_ORDERS_PAYMENT_TYPE_DETAILS[paymentType].helperText}</p>
        )}
      </div>

      {paymentType && (
        <p className="mt-4 rounded-card border border-[#efe6d2] bg-[#ffffff] p-3 text-[13.5px] text-primary">
          {SHOP_ORDERS_PAYMENT_TYPE_DETAILS[paymentType].noteText}
        </p>
      )}
    </div>
  )
}
