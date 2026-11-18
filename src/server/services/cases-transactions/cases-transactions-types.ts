import type { DeliveredTransactionAvailable } from "@/utils/cases-transactions"

export type { DeliveredTransactionAvailable }

export interface InventoryItem {
  id: string
  name: string
  deliveredQuantity: number
  checkedOutQuantity: number
  availableQuantity: number
  pricePerCaseCents: number
  profitPerCaseCents: number
  costPerCaseCents: number
  pricePerBarCents: number
  barsPerCase: number
  deliveredTransactionsAvailable: DeliveredTransactionAvailable[]
}
