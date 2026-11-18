export const LOW_STOCK_THRESHOLD_BARS = 5
export const BARS_PER_CASE = 40

export type PackageOption = {
  key: string
  label: string
  bars: number
  showBarsSubLabel: boolean
}

export type StockTier = "available" | "low" | "sold"

export function getPackageOptions(barsPerCase: number): PackageOption[] {
  return [
    { key: "one", label: "1 bar", bars: 1, showBarsSubLabel: false },
    { key: "five", label: "5 bars", bars: 5, showBarsSubLabel: false },
    { key: "ten", label: "10 bars", bars: 10, showBarsSubLabel: false },
    { key: "half", label: "Half case", bars: Math.floor(barsPerCase / 2), showBarsSubLabel: true },
    { key: "case", label: "Full case", bars: barsPerCase, showBarsSubLabel: true },
  ]
}

export function getPackageStockTier(
  packageBars: number,
  availableBars: number,
  thresholdBars: number = LOW_STOCK_THRESHOLD_BARS
): StockTier {
  if (packageBars > availableBars) return "sold"
  if (availableBars <= thresholdBars) return "low"
  return "available"
}
