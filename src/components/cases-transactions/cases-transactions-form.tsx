"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import {
  CASES_TRANSACTIONS_TYPE_DETAILS,
  CasesTransactionsTypeEnum,
  INVENTORY_EDIT_RECOMMENDATION,
} from "@/constants/cases-transactions"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { currencyType, numberType } from "@/lib/zod"
import { type CasesTransaction } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { formatCentsToCurrency, parseCurrency } from "@/utils/money"

const formSchema = z.object({
  quantity: numberType.int().positive(),
  barsPerCase: numberType.int().positive(),
  pricePerCase: currencyType,
  profitPerCase: currencyType,
  costPerCase: currencyType,
  isFreeCase: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CasesTransactionsFormProps {
  casesTransaction: CasesTransaction
  onUpdate?: () => void
  onBack?: () => void
}

export function CasesTransactionsForm({ casesTransaction, onUpdate, onBack }: CasesTransactionsFormProps) {
  const utils = api.useUtils()
  const { loggedInRole } = useLoggedInUser()

  const isCheckout = (casesTransaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.CHECKOUT
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"

  const { data: inventoryData } = api.casesTransactions.getCurrentInventory.useQuery(
    { campaignId: casesTransaction.campaignId! },
    { enabled: isCheckout && !!casesTransaction.campaignId }
  )

  const { mutateAsync: updateCasesTransaction } = api.casesTransactions.update.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: casesTransaction.quantity,
      barsPerCase: casesTransaction.barsPerCase ?? 0,
      pricePerCase: formatCentsToCurrency(
        (casesTransaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.CHECKOUT
          ? (casesTransaction.pricePerCaseCents ?? 0)
          : (casesTransaction.costPerCaseCents ?? 0)
      ),
      profitPerCase: formatCentsToCurrency(casesTransaction.profitPerCaseCents ?? 0),
      costPerCase: formatCentsToCurrency(casesTransaction.costPerCaseCents ?? 0),
      isFreeCase: casesTransaction.profitPerCaseCents === 6000,
    },
  })
  // price per case is fixed, so profit follows the cost that is entered
  const watchCost = form.watch("pricePerCase")

  useEffect(() => {
    if (!isInventoryUpdatesEnabled || isCheckout) return

    const costCents = Math.round(parseCurrency(watchCost ?? 0) * 100)
    const profitCents = Math.max((casesTransaction.pricePerCaseCents ?? 0) - costCents, 0)

    form.setValue("profitPerCase", formatCentsToCurrency(profitCents))
  }, [watchCost, casesTransaction.pricePerCaseCents, isCheckout, isInventoryUpdatesEnabled, form])

  const onSubmit = async (data: FormValues) => {
    if (casesTransaction) {
      await handleUpdateCasesTransaction(data)
    }
  }

  const handleUpdateCasesTransaction = async (data: FormValues) => {
    if (isCheckout) {
      const pricePerBarCents = casesTransaction.pricePerBarCents ?? 0
      const barsPerCase = casesTransaction.barsPerCase ?? 60
      const inventoryKey = `${pricePerBarCents}-${barsPerCase}`
      const inventoryItem = inventoryData?.inventoryItems.find(item => item.id === inventoryKey)
      const maxQuantity = (inventoryItem?.availableQuantity ?? 0) + casesTransaction.quantity

      if (data.quantity > maxQuantity) {
        toastError({
          error: new Error("Not enough cases available, please update inventory first."),
          toastOptions: {
            description: (
              <div>
                <br />
                <p>Requested: {data.quantity}</p>
                <p>Available: {maxQuantity}</p>
              </div>
            ),
          },
        })
        return
      }

      const pricePerCaseNum = parseFloat(data.pricePerCase) || 0

      const pricePerCaseCents = Math.round(pricePerCaseNum * 100)
      const totalPriceCents = Math.round(pricePerCaseCents * data.quantity)

      await updateCasesTransaction({
        id: casesTransaction.id,
        quantity: data.quantity,
        pricePerCaseCents,
        totalPriceCents,
      })
    }

    if ((casesTransaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.DELIVERED) {
      // profit is derived from the cost entered
      const enteredCostNum = parseFloat(data.pricePerCase) || 0
      const fixedPriceNum = (casesTransaction.pricePerCaseCents ?? 0) / 100

      if (isInventoryUpdatesEnabled && enteredCostNum > fixedPriceNum) {
        toastError({
          error: new Error("Cost per case cannot be greater than the price per case."),
          toastOptions: {
            description: (
              <div>
                <br />
                <p>Price per case: {formatCentsToCurrency(casesTransaction.pricePerCaseCents ?? 0)}</p>
              </div>
            ),
          },
        })
        return
      }

      const profitPerCaseNum = isInventoryUpdatesEnabled
        ? fixedPriceNum - enteredCostNum
        : parseFloat(data.profitPerCase) || 0
      const pricePerCaseNum = isInventoryUpdatesEnabled ? fixedPriceNum : enteredCostNum + profitPerCaseNum
      const costPerCaseNum = pricePerCaseNum - profitPerCaseNum

      // Convert to cents with proper rounding to avoid floating point precision issues
      const pricePerCaseCents = Math.round(pricePerCaseNum * 100)
      const totalPriceCents = Math.round(pricePerCaseCents * data.quantity)

      const profitPerCaseCents = Math.round(profitPerCaseNum * 100)
      const totalProfitCents = Math.round(profitPerCaseCents * data.quantity)

      const costPerCaseCents = Math.round(costPerCaseNum * 100)
      const totalCostCents = Math.round(costPerCaseCents * data.quantity)

      const pricePerBarCents = Math.round(pricePerCaseCents / data.barsPerCase)

      await updateCasesTransaction({
        id: casesTransaction.id,
        quantity: data.quantity,
        pricePerCaseCents,
        totalPriceCents,
        profitPerCaseCents,
        totalProfitCents,
        costPerCaseCents,
        totalCostCents,
        pricePerBarCents,
        barsPerCase: data.barsPerCase,
      })
    }

    const { label } = CASES_TRANSACTIONS_TYPE_DETAILS[casesTransaction.type as CasesTransactionsTypeEnum]

    toast.success(`${label} updated successfully`)

    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaigns.getSmallCardsMetrics.invalidate()
    void utils.casesTransactions.invalidate()
    void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
    void utils.campaigns.getPrizesOverview.invalidate()
    void utils.campaigns.getParticipantsByEvent.invalidate()

    onUpdate?.()
  }

  if (!loggedInRole) {
    return null
  }

  const checkoutTypeFields: FormField<FormValues>[] = [
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
    },
  ]

  const deliveredTypeFields: FormField<FormValues>[] = [
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
    },
    {
      name: "barsPerCase",
      label: "Number of Bars per Case",
      type: "number",
      required: true,
    },
    {
      name: "pricePerCase",
      label: "Cost per Case",
      type: "currency",
      required: true,
    },
    {
      name: "profitPerCase",
      label: "Profit per Case",
      labelSmall: isInventoryUpdatesEnabled ? " (auto-calculated)" : "",
      type: "currency",
      required: true,
      // Profit is auto-calculated
      disabled: isInventoryUpdatesEnabled,
      readOnly: isInventoryUpdatesEnabled,
    },
  ]

  const fields: FormField<FormValues>[] = isCheckout ? checkoutTypeFields : deliveredTypeFields

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {isInventoryUpdatesEnabled && !isCheckout && (
          <div className="rounded-card border border-orange-300 bg-orange-50 p-3 text-sm">
            {INVENTORY_EDIT_RECOMMENDATION}
          </div>
        )}

        {fields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        <div className={cn("flex justify-end gap-2", casesTransaction && "justify-start")}>
          {onBack && (
            <Button
              variant="secondary"
              onClick={e => {
                e.preventDefault()
                onBack()
              }}
              disabled={form.formState.isSubmitting}
            >
              <ArrowLeft />
              Back
            </Button>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {casesTransaction && <Save />}

            {casesTransaction
              ? form.formState.isSubmitting
                ? "Saving..."
                : "Save"
              : form.formState.isSubmitting
                ? "Creating..."
                : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
