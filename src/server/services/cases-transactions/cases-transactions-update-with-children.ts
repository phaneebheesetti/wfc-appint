import { eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { type CasesTransactionInsert, type CasesTransactionSelect, casesTransactions } from "@/server/db/schema"

const PRICING_FIELDS = ["pricePerBarCents", "barsPerCase", "costPerCaseCents", "profitPerCaseCents"] as const

export const casesTransactionsUpdateWithChildren = async ({
  database,
  input,
}: {
  database: typeof db
  input: Partial<CasesTransactionInsert> & { id: string }
}): Promise<CasesTransactionSelect | null> => {
  const [updatedTransaction] = await database
    .update(casesTransactions)
    .set(input)
    .where(eq(casesTransactions.id, input.id))
    .returning()

  if (!updatedTransaction) {
    return null
  }

  if ((updatedTransaction.type as CasesTransactionsTypeEnum) !== CasesTransactionsTypeEnum.DELIVERED) {
    return updatedTransaction
  }

  const hasPricingChanges = PRICING_FIELDS.some(field => field in input)
  if (!hasPricingChanges) {
    return updatedTransaction
  }

  const childTransactions = await database.query.casesTransactions.findMany({
    where: eq(casesTransactions.parentTransactionId, updatedTransaction.id),
  })

  if (childTransactions.length === 0) {
    return updatedTransaction
  }

  const pricePerBarCents = updatedTransaction.pricePerBarCents ?? 0
  const barsPerCase = updatedTransaction.barsPerCase ?? 0
  const costPerCaseCents = updatedTransaction.costPerCaseCents ?? 0
  const profitPerCaseCents = updatedTransaction.profitPerCaseCents ?? 0
  const pricePerCaseCents = Math.round(pricePerBarCents * barsPerCase)

  await Promise.all(
    childTransactions.map(child => {
      const totalPriceCents = Math.round(pricePerCaseCents * child.quantity)
      const totalCostCents = Math.round(costPerCaseCents * child.quantity)
      const totalProfitCents = Math.round(profitPerCaseCents * child.quantity)

      return database
        .update(casesTransactions)
        .set({
          pricePerBarCents,
          barsPerCase,
          costPerCaseCents,
          profitPerCaseCents,
          pricePerCaseCents,
          totalPriceCents,
          totalCostCents,
          totalProfitCents,
        })
        .where(eq(casesTransactions.id, child.id))
    })
  )

  return updatedTransaction
}
