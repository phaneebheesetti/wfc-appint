import { SheetSimple } from "@/components/ui/sheet/sheet-simple"

import { InventoryCasesView } from "./inventory-cases-view"

export interface InventoryAggregateData {
  campaignId: string
  campaignName: string
  totalCasesCheckedOut: number
  totalCasesPaid: number
  totalAmountOwedCents: number
  totalAmountPaidCents: number
  pricePerCaseCents: number
  participants: Set<string>
  participantNames: string[]
  createdAt: Date
}

interface InventoryCasesActionsProps {
  inventoryData: InventoryAggregateData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryCasesActions({ inventoryData, open, onOpenChange }: InventoryCasesActionsProps) {
  if (!inventoryData) return null

  return (
    <SheetSimple
      open={open}
      onOpenChange={onOpenChange}
      title={inventoryData.campaignName ?? "Inventory Details"}
      description="Fundraiser Inventory Details"
    >
      <InventoryCasesView inventoryData={inventoryData} />
    </SheetSimple>
  )
}
