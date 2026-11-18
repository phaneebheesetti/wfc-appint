import { Minus, Plus } from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "@/utils/cn"

interface InventoryStepperRowProps {
  label: string
  sublabel: string
  value: number
  onDecrement: () => void
  onIncrement: () => void
  /** Visually greyed out, but still clickable — so a click can surface why it's blocked. */
  decrementBlocked: boolean
  incrementBlocked?: boolean
  decrementLabel: string
  incrementLabel: string
}

export function InventoryStepperRow({
  label,
  sublabel,
  value,
  onDecrement,
  onIncrement,
  decrementBlocked,
  incrementBlocked,
  decrementLabel,
  incrementLabel,
}: InventoryStepperRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <StepperButton aria-label={decrementLabel} blocked={decrementBlocked} onClick={onDecrement}>
          <Minus className="h-4 w-4" />
        </StepperButton>
        <span className="w-6 text-center text-lg font-semibold text-foreground">{value}</span>
        <StepperButton aria-label={incrementLabel} blocked={incrementBlocked} onClick={onIncrement}>
          <Plus className="h-4 w-4" />
        </StepperButton>
      </div>
    </div>
  )
}

interface StepperButtonProps {
  "aria-label": string
  blocked?: boolean
  onClick: () => void
  children: ReactNode
}

function StepperButton({ "aria-label": ariaLabel, blocked = false, onClick, children }: StepperButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={blocked}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white active:bg-muted",
        blocked && "cursor-not-allowed opacity-40 active:bg-white"
      )}
    >
      {children}
    </button>
  )
}
