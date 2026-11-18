"use client"

import { CreditCard } from "lucide-react"

import { Switch } from "@/components/ui/switch"

// Digital-payment toggle for FC onboarding Step 4 and the Add-Fundraiser popup.
// The Prize Program switch that used to sit alongside it was replaced by `PrizeProgramSelect`
// (a single-select list of Home Run templates); see `FeatureSelectionFields`.
export function DigitalPaymentToggle({
  digitalPayment,
  onDigitalPaymentChange,
  disabled = false,
}: {
  digitalPayment: boolean
  onDigitalPaymentChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <ToggleRow
      icon={CreditCard}
      title="Digital Payment"
      description="Collect digital payments to make more sales."
      checked={digitalPayment}
      onCheckedChange={onDigitalPaymentChange}
      disabled={disabled}
    />
  )
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: typeof CreditCard
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-control border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-control bg-rose-100 text-rose-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
