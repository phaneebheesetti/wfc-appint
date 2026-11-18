import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { CasesTransaction } from "@/server/db/schema/cases-transactions"

export interface DeliveredTransactionAvailable {
  id: string
  quantity: number
  updatedAt: Date
}

export type sfOrderDetails = {
  orderId: string
  billedCases: number
  freeCases: number
  costPerCase: number
  profitPerCase: number
  barsPerCase: number
  product: string
}

export const getTotalCasesDelivered = (casesTransactions: CasesTransaction[]) => {
  return casesTransactions
    .filter(transaction => (transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.DELIVERED)
    .reduce((acc, transaction) => acc + transaction.quantity, 0)
}

export const getTotalCasesCheckedOut = (casesTransactions: CasesTransaction[]) => {
  return casesTransactions
    .filter(transaction => (transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.CHECKOUT)
    .reduce((acc, transaction) => acc + transaction.quantity, 0)
}

export const getTotalCasesAdjusted = (casesTransactions: CasesTransaction[]) => {
  return casesTransactions
    .filter(
      transaction => (transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT
    )
    .reduce((acc, transaction) => acc + transaction.quantity, 0)
}

export interface FifoCheckoutTransactionBase {
  type: string
  organizationId: string
  campaignId: string
  createdByUserId: string
  userId: string
  barsPerCase: number
  pricePerBarCents: number
  pricePerCaseCents: number
}

export interface FifoCheckoutInput {
  quantity: number
  deliveredTransactionsAvailable: DeliveredTransactionAvailable[]
  baseTransaction: FifoCheckoutTransactionBase
}

export interface FifoCheckoutTransaction extends FifoCheckoutTransactionBase {
  quantity: number
  totalPriceCents: number
  parentTransactionId: string
}

export function buildFifoCheckoutTransactions({
  quantity,
  deliveredTransactionsAvailable,
  baseTransaction,
}: FifoCheckoutInput): FifoCheckoutTransaction[] {
  const transactions: FifoCheckoutTransaction[] = []
  let remainingQuantity = quantity

  for (const deliveredTransaction of deliveredTransactionsAvailable) {
    if (remainingQuantity <= 0) break

    const quantityFromThisTransaction = Math.min(remainingQuantity, deliveredTransaction.quantity)
    const totalPriceCents = Math.round(baseTransaction.pricePerCaseCents * quantityFromThisTransaction)

    transactions.push({
      ...baseTransaction,
      quantity: quantityFromThisTransaction,
      totalPriceCents,
      parentTransactionId: deliveredTransaction.id,
    })

    remainingQuantity -= quantityFromThisTransaction
  }

  return transactions
}

export function deductFromDeliveredTransactions(
  deliveredTransactionsAvailable: DeliveredTransactionAvailable[],
  quantityToDeduct: number
): DeliveredTransactionAvailable[] {
  let remaining = quantityToDeduct

  return deliveredTransactionsAvailable
    .map(t => {
      if (remaining <= 0) return t
      const deducted = Math.min(remaining, t.quantity)
      remaining -= deducted
      return { ...t, quantity: t.quantity - deducted }
    })
    .filter(t => t.quantity > 0)
}

export function getCaseName(transaction: { pricePerBarCents: number; barsPerCase: number }): string {
  const pricePerBar = (transaction.pricePerBarCents ?? 0) / 100
  const barsPerCase = transaction.barsPerCase ?? 0

  const displayPricePerBar = pricePerBar === 0 ? "Free" : `$${pricePerBar}`

  return `${displayPricePerBar} Bar Case - ${barsPerCase} count`
}
