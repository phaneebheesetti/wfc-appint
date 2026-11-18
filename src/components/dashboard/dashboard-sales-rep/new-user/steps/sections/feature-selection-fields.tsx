"use client"

import { DigitalPaymentToggle } from "@/components/dashboard/dashboard-sales-rep/new-user/steps/sections/prize-payment-toggles"
import { PrizeProgramOptions } from "@/components/prizes/prize-program-options"
import { type PrizeTemplateSelection } from "@/constants/prize-selection"

export function FeatureSelectionFields({
  prizeTemplateSlug,
  digitalPayment,
  onPrizeTemplateChange,
  onDigitalPaymentChange,
  disabled = false,
}: {
  prizeTemplateSlug: PrizeTemplateSelection
  digitalPayment: boolean
  onPrizeTemplateChange: (value: PrizeTemplateSelection) => void
  onDigitalPaymentChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <PrizeProgramOptions value={prizeTemplateSlug} onChange={onPrizeTemplateChange} disabled={disabled} />
      <DigitalPaymentToggle
        digitalPayment={digitalPayment}
        onDigitalPaymentChange={onDigitalPaymentChange}
        disabled={disabled}
      />
    </div>
  )
}
