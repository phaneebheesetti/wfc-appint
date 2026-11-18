"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, CheckCircle2, Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"
import { formatCentsToCurrency, formatCurrencyToCents } from "@/utils/money"

import {
  DEFAULT_PRODUCT,
  type InventoryFormValues,
  InventoryProductsFields,
  type ProductValues,
  inventoryFormSchema,
} from "../dashboard-sales-rep/new-user/steps/sections/inventory-products-fields"

type FormValues = InventoryFormValues

type OaAddProductProps = {
  campaignId: string
  organizationId: string
  isSaved: boolean
  inventoryCreatedByCurrentUser: boolean
  onSavedAndContinue: () => Promise<void> | void
  onSkip: () => void
}

export function OaAddProduct({
  campaignId,
  organizationId,
  isSaved,
  inventoryCreatedByCurrentUser,
  onSavedAndContinue,
  onSkip,
}: OaAddProductProps) {
  const { loggedInUserId } = useLoggedInUser()
  const { mutateAsync: createCasesTransaction } = api.casesTransactions.create.useMutation()
  const { mutateAsync: deleteCasesTransaction } = api.casesTransactions.delete.useMutation()

  const { data: transactions = [], refetch: refetchTransactions } = api.casesTransactions.getByCampaignId.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  )

  const [editing, setEditing] = useState(false)
  const deliveredTransactions = transactions.filter(t => t.type === CasesTransactionsTypeEnum.DELIVERED)

  const productGroups = deliveredTransactions
    .filter(t => !t.parentTransactionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(billed => ({
      billed,
      free: deliveredTransactions.find(t => t.parentTransactionId === billed.id),
    }))

  const existingProducts: ProductValues[] = productGroups.map(({ billed, free }) => ({
    casesBilled: billed.quantity ?? 0,
    casesFree: free?.quantity ?? 0,
    barsPerCase: billed.barsPerCase ?? free?.barsPerCase ?? 40,
    pricePerCase: formatCentsToCurrency(billed.costPerCaseCents ?? 0),
    profitPerCase: formatCentsToCurrency(billed.profitPerCaseCents ?? 0),
  }))

  const form = useForm<FormValues>({
    resolver: zodResolver(inventoryFormSchema),
    mode: "onChange",
    defaultValues: { products: [DEFAULT_PRODUCT] },
  })

  const onEdit = () => {
    form.reset({ products: existingProducts.length > 0 ? existingProducts : [DEFAULT_PRODUCT] })
    setEditing(true)
  }

  const onSubmit = async (data: FormValues) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    await Promise.all(deliveredTransactions.map(transaction => deleteCasesTransaction({ id: transaction.id })))

    const hasInventory = data.products.some(p => (p.casesBilled ?? 0) > 0 || (p.casesFree ?? 0) > 0)

    if (!hasInventory) {
      toast.error("Add at least one product before continuing.")
      return
    }

    for (const product of data.products) {
      const profitPerCaseCents = formatCurrencyToCents(product.profitPerCase) || 0
      const costPerCaseCents = formatCurrencyToCents(product.pricePerCase) || 0
      const pricePerCaseCents = costPerCaseCents + profitPerCaseCents
      const pricePerBarCents = Math.round(pricePerCaseCents / product.barsPerCase)

      const billedQuantity = product.casesBilled ?? 0
      const freeQuantity = product.casesFree ?? 0

      const createRow = (quantity: number, isFree: boolean, parentTransactionId: string | null) =>
        createCasesTransaction({
          parentTransactionId,
          createdByUserId: loggedInUserId,
          organizationId,
          campaignId,
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
        })

      if (billedQuantity <= 0 && freeQuantity <= 0) continue
      const billed = await createRow(billedQuantity, false, null)
      await createRow(freeQuantity, true, billed?.id ?? null)
    }

    await refetchTransactions()

    toast.success("Product Selection saved")
    setEditing(false)
    await onSavedAndContinue()
  }

  if (isSaved && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="text-green-900">
            {inventoryCreatedByCurrentUser
              ? "Product selection step completed."
              : "Good news! Your FC has already set up your initial inventory!"}
          </div>
        </div>
        {inventoryCreatedByCurrentUser && (
          <Button type="button" variant="outline" size="sm" className="text-black" onClick={onEdit}>
            <Pencil />
            Edit
          </Button>
        )}
      </div>
    )
  }

  return (
    <Form {...form}>
      <p className="mb-4 text-sm text-muted-foreground">
        Pick the chocolate products and quantities your group will sell.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <InventoryProductsFields control={form.control} />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : editing ? "Save Changes" : "Save & Continue"} <ArrowRight />
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now <ArrowRight />
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
