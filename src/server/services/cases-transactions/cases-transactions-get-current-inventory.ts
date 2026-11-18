import { and, eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { env } from "@/env"
import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"
import { getCaseName } from "@/utils/cases-transactions"

import type { InventoryItem } from "./cases-transactions-types"

export const casesTransactionsGetCurrentInventory = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const deliveredCases = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.DELIVERED)
    ),
  })

  const checkedOutCases = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
  })

  // Inventory adjustments are only counted when the feature flag is on
  const adjustedCases =
    env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
      ? await database.query.casesTransactions.findMany({
          where: and(
            eq(casesTransactions.campaignId, input.campaignId),
            eq(casesTransactions.type, CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT)
          ),
        })
      : []

  const groupedInventory = deliveredCases.reduce((acc: Record<string, InventoryItem>, deliveredCase) => {
    const pricePerBarCents = deliveredCase.pricePerBarCents ?? 0
    const barsPerCase = deliveredCase.barsPerCase ?? 60
    const costPerCaseCents = deliveredCase.costPerCaseCents ?? 0
    const pricePerCaseCents = deliveredCase.pricePerCaseCents ?? 0
    const profitPerCaseCents = deliveredCase.profitPerCaseCents ?? 0
    const key = `${pricePerBarCents}-${barsPerCase}`

    acc[key] ??= {
      id: key,
      name: getCaseName({ pricePerBarCents, barsPerCase }),
      deliveredQuantity: 0,
      checkedOutQuantity: 0,
      availableQuantity: 0,
      pricePerCaseCents,
      profitPerCaseCents,
      costPerCaseCents,
      pricePerBarCents,
      barsPerCase,
      deliveredTransactionsAvailable: [],
    }

    acc[key].deliveredQuantity += deliveredCase.quantity
    acc[key].deliveredTransactionsAvailable.push({
      id: deliveredCase.id,
      quantity: deliveredCase.quantity,
      updatedAt: deliveredCase.updatedAt ?? deliveredCase.createdAt,
    })

    return acc
  }, {})

  checkedOutCases.forEach(checkout => {
    const pricePerBarCents = checkout.pricePerBarCents ?? 0
    const barsPerCase = checkout.barsPerCase ?? 60
    const quantity = checkout.quantity ?? 0

    const key = `${pricePerBarCents}-${barsPerCase}`

    if (groupedInventory[key]) {
      groupedInventory[key].checkedOutQuantity += quantity
    }
  })

  // Inventory adjustments reduce what is available per case type, same as checkouts
  const adjustedQuantityByKey: Record<string, number> = {}

  adjustedCases.forEach(adjustment => {
    const pricePerBarCents = adjustment.pricePerBarCents ?? 0
    const barsPerCase = adjustment.barsPerCase ?? 60
    const quantity = adjustment.quantity ?? 0

    const key = `${pricePerBarCents}-${barsPerCase}`

    adjustedQuantityByKey[key] = (adjustedQuantityByKey[key] ?? 0) + quantity
  })

  const inventoryByCase = Object.values(groupedInventory).map(group => {
    const adjustedQuantity = adjustedQuantityByKey[group.id] ?? 0
    const unavailableQuantity = group.checkedOutQuantity + adjustedQuantity
    const availableQuantity = group.deliveredQuantity - unavailableQuantity
    const sortedTransactions = group.deliveredTransactionsAvailable.sort(
      (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
    )

    let remainingToDeduct = unavailableQuantity
    const deliveredTransactionsAvailable = sortedTransactions
      .map(t => {
        if (remainingToDeduct <= 0) return t
        const deducted = Math.min(remainingToDeduct, t.quantity)
        remainingToDeduct -= deducted
        return { ...t, quantity: t.quantity - deducted }
      })
      .filter(t => t.quantity > 0)

    return {
      ...group,
      name: getCaseName(group),
      availableQuantity: availableQuantity > 0 ? availableQuantity : 0,
      deliveredTransactionsAvailable,
    } as InventoryItem
  })

  return {
    inventoryItems: inventoryByCase,
  }
}
