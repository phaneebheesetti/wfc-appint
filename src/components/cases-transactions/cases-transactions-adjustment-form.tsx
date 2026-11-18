"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import {
  CASES_TRANSACTIONS_TYPE_DETAILS,
  CasesTransactionsTypeEnum,
  INVENTORY_EDIT_RECOMMENDATION,
} from "@/constants/cases-transactions"
import { env } from "@/env"
import { numberType } from "@/lib/zod"
import { type CasesTransaction } from "@/server/db/schema"
import { api } from "@/trpc/react"

const getFormSchema = (maxQuantity: number) =>
  z.object({
    quantity: numberType
      .int()
      .positive("Adjustment quantity must be greater than 0")
      .max(maxQuantity, `Maximum available quantity to adjust is ${maxQuantity}.`),
    note: z.string().trim().min(1, "A note is required for every inventory adjustment."),
  })

type FormValues = z.infer<ReturnType<typeof getFormSchema>>

interface CasesTransactionsAdjustmentFormProps {
  casesTransaction: CasesTransaction
  onUpdate?: () => void
  onBack?: () => void
}

export function CasesTransactionsAdjustmentForm({
  casesTransaction,
  onUpdate,
  onBack,
}: CasesTransactionsAdjustmentFormProps) {
  const utils = api.useUtils()

  const { data: inventoryData } = api.casesTransactions.getCurrentInventory.useQuery(
    { campaignId: casesTransaction.campaignId! },
    { enabled: !!casesTransaction.campaignId }
  )

  const { mutateAsync: updateCasesTransaction } = api.casesTransactions.update.useMutation()

  // Same key used by the inventory to group case types
  const inventoryKey = `${casesTransaction.pricePerBarCents ?? 0}-${casesTransaction.barsPerCase ?? 60}`
  const inventoryItem = inventoryData?.inventoryItems.find(item => item.id === inventoryKey)
  const maxQuantity = (inventoryItem?.availableQuantity ?? 0) + casesTransaction.quantity

  const form = useForm<FormValues>({
    resolver: (values, context, options) => zodResolver(getFormSchema(maxQuantity))(values, context, options),
    mode: "onChange",
    defaultValues: {
      quantity: casesTransaction.quantity,
      note: casesTransaction.note ?? "",
    },
  })

  // The max is only known once the inventory has loaded, so re-check the quantity when it changes
  useEffect(() => {
    void form.trigger("quantity")
  }, [maxQuantity, form])

  const onSubmit = async (data: FormValues) => {
    // Keep the stored price in sync with the new quantity
    const pricePerCaseCents = inventoryItem?.pricePerCaseCents ?? casesTransaction.pricePerCaseCents ?? 0

    await updateCasesTransaction({
      id: casesTransaction.id,
      quantity: data.quantity,
      note: data.note.trim(),
      pricePerCaseCents,
      totalPriceCents: Math.round(pricePerCaseCents * data.quantity),
    })

    const { label } = CASES_TRANSACTIONS_TYPE_DETAILS[CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT]

    toast.success(`${label} updated successfully`)

    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaigns.getSmallCardsMetrics.invalidate()
    void utils.casesTransactions.invalidate()

    onUpdate?.()
  }

  const { isValid, isSubmitting, errors } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true" && (
          <div className="rounded-card border border-orange-300 bg-orange-50 p-3 text-sm">
            {INVENTORY_EDIT_RECOMMENDATION}
          </div>
        )}

        <FormFieldWrapper
          name="quantity"
          label="Quantity"
          labelSmall=" (shortage/damages)"
          type="number"
          control={form.control}
          description={errors.quantity ? null : `Maximum available to adjust: ${maxQuantity}`}
          required
        />

        <FormFieldWrapper
          name="note"
          label="Note"
          labelSmall=" (required)"
          type="textarea"
          control={form.control}
          rows={3}
        />

        <div className="flex justify-start gap-2">
          {onBack && (
            <Button
              variant="secondary"
              onClick={e => {
                e.preventDefault()
                onBack()
              }}
              disabled={isSubmitting}
            >
              <ArrowLeft />
              Back
            </Button>
          )}

          <Button type="submit" disabled={!isValid || isSubmitting}>
            <Save />
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
