"use client"

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { type StockTier, getPackageOptions, getPackageStockTier } from "@/constants/inventory"
import { cn } from "@/utils/cn"
import { formatCentsToCurrency } from "@/utils/money"

type PackageSelectorProps = {
  availableBars: number
  barsPerCase: number
  pricePerBarCents: number
  selectedKey: string | null
  onSelect: (key: string, isRequest: boolean, priceCents: number, label: string, bars: number) => void
}

const TIER_DETAILS: Record<
  StockTier,
  { label: string; variant: "success" | "warning" | "error"; icon: typeof CheckCircle2 }
> = {
  available: { label: "Available", variant: "success", icon: CheckCircle2 },
  low: { label: "Low Stock", variant: "warning", icon: AlertTriangle },
  sold: { label: "Sold Out", variant: "error", icon: XCircle },
}

export function PackageSelector({
  availableBars,
  barsPerCase,
  pricePerBarCents,
  selectedKey,
  onSelect,
}: PackageSelectorProps) {
  const packages = getPackageOptions(barsPerCase).map(pkg => ({
    ...pkg,
    tier: getPackageStockTier(pkg.bars, availableBars),
    priceCents: pkg.bars * pricePerBarCents,
  }))

  const orderedPackages = [
    ...packages.filter(pkg => pkg.tier !== "sold"),
    ...packages.filter(pkg => pkg.tier === "sold"),
  ]

  return (
    <div className="mb-[10px] rounded-[18px] border border-border bg-card p-[14px] shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
          Place Your Order
        </span>
        <span className="text-[11px] text-muted-foreground">
          (Order online for in-person delivery. Shipping is not available)
        </span>
      </div>

      <div className="space-y-2">
        {orderedPackages.map(pkg => {
          const isRequest = pkg.tier === "sold"
          const isSelected = selectedKey === pkg.key
          const { label, variant, icon: Icon } = TIER_DETAILS[pkg.tier]

          return (
            <button
              key={pkg.key}
              type="button"
              onClick={() => onSelect(pkg.key, isRequest, pkg.priceCents, pkg.label, pkg.bars)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                isRequest ? "bg-muted/40" : "bg-card",
                isSelected && !isRequest && "border-primary bg-primary/5",
                isSelected && isRequest && "border-destructive bg-destructive/5",
                !isSelected && "border-border"
              )}
            >
              <div className="flex-1">
                <div className={cn("text-sm font-medium", isRequest ? "text-muted-foreground" : "text-foreground")}>
                  {pkg.label}
                </div>

                {pkg.showBarsSubLabel && <div className="mt-0.5 text-xs text-muted-foreground">{pkg.bars} bars</div>}

                <Badge variant={variant} className="mt-1.5 gap-1">
                  <Icon className="h-3 w-3" />
                  {label}
                </Badge>
              </div>

              <div className="text-right">
                <div className={cn("text-sm font-semibold", isRequest ? "text-muted-foreground" : "text-primary")}>
                  {formatCentsToCurrency(pkg.priceCents)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatCentsToCurrency(pricePerBarCents)}/bar
                </div>
              </div>

              <div
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                  isSelected && !isRequest && "border-primary bg-primary",
                  isSelected && isRequest && "border-destructive bg-destructive",
                  !isSelected && "border-border"
                )}
              >
                {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
