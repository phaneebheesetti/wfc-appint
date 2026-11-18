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
} from "./sections/inventory-products-fields"

type FormValues = InventoryFormValues

type Step3InventoryProps = {
  campaignId: string
  organizationId: string
  isSaved: boolean
  onSavedAndContinue: () => Promise<void> | void
  onSkip: () => void
}

export function Step3Inventory({
  campaignId,
  organizationId,
  isSaved,
  onSavedAndContinue,
  onSkip,
}: Step3InventoryProps) {
  const { loggedInUserId } = useLoggedInUser()
  const { mutateAsync: createCasesTransaction } = api.casesTransactions.create.useMutation()
  const { mutateAsync: deleteCasesTransaction } = api.casesTransactions.delete.useMutation()
  const { mutateAsync: setOnboardingStep } = api.users.setOnboardingStep.useMutation()

  const { data: transactions = [], refetch: refetchTransactions } = api.casesTransactions.getByCampaignId.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  )

  // When the step is already saved we show a summary; "Edit" reveals the form prefilled with current values.
  const [editing, setEditing] = useState(false)

  const [sfOrderId, setSfOrderId] = useState<string | undefined>()

  // Each product is two delivered rows: a billed row (the parent + product anchor) and a free row linked to it
  // via parentTransactionId. We reconstruct from that explicit link — not timestamp order or price — so
  // duplicate products (or ones sharing a price-per-bar, or with $0 cost) always round-trip as distinct records
  // on edit. The link is cleared at launch so it never interacts with post-launch inventory editing.
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

    // Replace existing inventory: clear current delivered transactions, then recreate from the form.
    await Promise.all(deliveredTransactions.map(transaction => deleteCasesTransaction({ id: transaction.id })))

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
          sfOrderId,
          sfProductName: product.sfProductName ?? null,
        })

      // Each product is a billed row (parent/anchor) plus a free row linked to it via parentTransactionId — so
      // the pair survives editing even for duplicates or $0-cost products. We link the free row to the id the
      // server returns for the billed row (no client-generated ids), and always write both rows (the empty
      // bucket as a zero-quantity placeholder) so the product is reconstructable from the link alone.
      if (billedQuantity <= 0 && freeQuantity <= 0) continue
      const billed = await createRow(billedQuantity, false, null)
      await createRow(freeQuantity, true, billed?.id ?? null)
    }

    await setOnboardingStep({
      userId: loggedInUserId,
      campaignId,
      step: "inventorySavedAt",
      savedAt: new Date().toISOString(),
    })
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
          <div className="font-semibold text-green-900">Product Selection completed</div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <p className="mb-4 text-sm text-muted-foreground">
        Add the chocolate products and quantities. If you want Org Admin or Staff to add them, just click on &quot;Save
        &amp; Continue&quot; to go to next step.
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <InventoryProductsFields
          control={form.control}
          onSfOrderId={setSfOrderId}
          orderId={transactions[0]?.sfOrderId ?? null}
        />

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
