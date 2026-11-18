import { FieldText } from "@/components/ui/text"
import { formatDate } from "@/utils/date"

import { type InventoryAggregateData } from "./inventory-cases-actions"

interface InventoryCasesViewProps {
  inventoryData: InventoryAggregateData
}

export function InventoryCasesView({ inventoryData }: InventoryCasesViewProps) {
  const owedCents = inventoryData.totalAmountOwedCents - inventoryData.totalAmountPaidCents
  const owed = owedCents / 100

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Fundraiser" value={inventoryData.campaignName ?? "Unknown"} />

      <FieldText label="Participants" value={inventoryData.participantNames.join(", ") || "None"} />

      <FieldText label="Cases Checked Out" value={inventoryData.totalCasesCheckedOut} />

      <FieldText label="Cases Paid" value={Math.floor(inventoryData.totalCasesPaid)} />

      <FieldText label="Price per Case" value={`$${(inventoryData.pricePerCaseCents / 100).toFixed(2)}`} />

      <FieldText label="Total Amount Owed" value={`$${(owed > 0 ? owed : 0).toFixed(2)}`} />

      <FieldText label="Total Amount Paid" value={`$${(inventoryData.totalAmountPaidCents / 100).toFixed(2)}`} />

      <FieldText label="Date" value={formatDate(inventoryData.createdAt)} />
    </div>
  )
}
