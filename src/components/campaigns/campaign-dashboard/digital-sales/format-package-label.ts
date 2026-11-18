const CASE_LABELS_NEEDING_BARS = new Set(["Half case", "Full case"])

export function formatPackageLabel(packageLabel: string, barsQuantity: number): string {
  if (CASE_LABELS_NEEDING_BARS.has(packageLabel)) {
    return `${packageLabel} (${barsQuantity} bars)`
  }
  return packageLabel
}
