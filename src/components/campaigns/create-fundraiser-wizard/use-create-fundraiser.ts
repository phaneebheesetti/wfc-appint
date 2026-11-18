"use client"

import { type ProductValues } from "@/components/dashboard/dashboard-sales-rep/new-user/steps/sections/inventory-products-fields"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { type PrizeTemplateSelection } from "@/constants/prize-selection"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatCurrencyToCents } from "@/utils/money"
import { firstLetterUpperCase } from "@/utils/string"

export type CreateFundraiserInput = {
  organizationId: string
  fundraiser: { name: string; startDate: Date; endDate: Date }
  // Empty when the inventory step was skipped.
  products: ProductValues[]
  prizeTemplateSlug: PrizeTemplateSelection
  digitalPayment: boolean
  sponsorId: string
  sfOrderId?: string
}

// Commit-at-end persistence for the Add-Fundraiser popup: creates a normal (active, published) campaign for
// the org plus its selected prize template and inventory in one go. Mirrors what onboarding Steps 2–4 persist, minus
// the draft visibility and onboarding-progress tracking, so nothing touches the DB until this runs.
export function useCreateFundraiser() {
  const { loggedInUserId } = useLoggedInUser()

  const { mutateAsync: createCampaign } = api.campaigns.create.useMutation()
  const { mutateAsync: applyPrizeTemplate } = api.prizes.applyTemplate.useMutation()
  const { mutateAsync: createCasesTransaction } = api.casesTransactions.create.useMutation()

  const createFundraiser = async (input: CreateFundraiserInput): Promise<Campaign> => {
    if (!loggedInUserId) throw new Error("User not found")

    const { organizationId, fundraiser, products, prizeTemplateSlug, digitalPayment, sponsorId, sfOrderId } = input

    // status/visibility fall back to the schema defaults (ACTIVE / PUBLISHED) — a real, live fundraiser.
    const campaign = await createCampaign({
      name: firstLetterUpperCase(fundraiser.name),
      startDate: fundraiser.startDate,
      endDate: fundraiser.endDate,
      organizationId,
      createdByUserId: loggedInUserId,
      sponsorId,
      profitSharePercentage: 0,
      digitalPayment,
    })

    if (!campaign) throw new Error("Failed to create fundraiser")

    if (prizeTemplateSlug) {
      await applyPrizeTemplate({ campaignId: campaign.id, prizeTemplateSlug })
    }

    for (const product of products) {
      const profitPerCaseCents = formatCurrencyToCents(product.profitPerCase) || 0
      const costPerCaseCents = formatCurrencyToCents(product.pricePerCase) || 0
      const pricePerCaseCents = costPerCaseCents + profitPerCaseCents
      const pricePerBarCents = Math.round(pricePerCaseCents / product.barsPerCase)

      const billedQuantity = product.casesBilled ?? 0
      const freeQuantity = product.casesFree ?? 0

      // Free cases carry no cost — the whole price counts as profit (mirrors onboarding Step 3). Unlike Step 3
      // we don't link billed↔free here: that link is onboarding-only and this campaign is live immediately.
      const createRow = (quantity: number, isFree: boolean) =>
        createCasesTransaction({
          createdByUserId: loggedInUserId,
          organizationId,
          campaignId: campaign.id,
          type: CasesTransactionsTypeEnum.DELIVERED,
          quantity,
          barsPerCase: product.barsPerCase,
          pricePerCaseCents,
          totalPriceCents: pricePerCaseCents * quantity,
          profitPerCaseCents: isFree ? pricePerCaseCents : profitPerCaseCents,
          totalProfitCents: (isFree ? pricePerCaseCents : profitPerCaseCents) * quantity,
          costPerCaseCents: isFree ? 0 : costPerCaseCents,
          totalCostCents: (isFree ? 0 : costPerCaseCents) * quantity,
          pricePerBarCents,
          sfOrderId: sfOrderId || null,
          sfProductName: product.sfProductName ?? null,
        })

      if (billedQuantity > 0) await createRow(billedQuantity, false)
      if (freeQuantity > 0) await createRow(freeQuantity, true)
    }

    return campaign
  }

  return { createFundraiser }
}
