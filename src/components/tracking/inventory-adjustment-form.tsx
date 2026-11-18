"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import {
  CASES_TRANSACTIONS_TYPE_DETAILS,
  CasesTransactionsTypeEnum,
  INVENTORY_DISCLAIMER,
} from "@/constants/cases-transactions"
import { useLoggedInUser } from "@/hooks"
import { numberType } from "@/lib/zod"
import { api } from "@/trpc/react"
import { toastError } from "@/utils/errors"

const { icon: AdjustmentIcon } = CASES_TRANSACTIONS_TYPE_DETAILS[CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT]

const getFormSchema = (maxQuantity: number) =>
  z.object({
    caseId: z.string().min(1, "Select a case type"),
    quantity: numberType
      .int()
      .positive("Adjustment quantity must be greater than 0")
      .max(maxQuantity, `Maximum available quantity to adjust is ${maxQuantity}.`),
    note: z.string().trim().min(1, "A note is required for every inventory adjustment."),
  })

type FormValues = z.infer<ReturnType<typeof getFormSchema>>

interface InventoryAdjustmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
}

export function InventoryAdjustmentForm({
  open,
  onOpenChange,
  campaignId,
  organizationId,
}: InventoryAdjustmentFormProps) {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const utils = api.useUtils()

  const { data: inventoryData } = api.casesTransactions.getCurrentInventory.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  )
  const inventoryItems = inventoryData?.inventoryItems

  const { mutateAsync: createInventoryAdjustment } = api.casesTransactions.create.useMutation()

  const form = useForm<FormValues>({
    // The max allowed depends on the selected case type, so the schema is built at validation time
    resolver: (values, context, options) => {
      const selected = inventoryItems?.find(item => item.id === values.caseId)
      return zodResolver(getFormSchema(selected?.availableQuantity ?? 0))(values, context, options)
    },
    mode: "onChange",
    defaultValues: {
      caseId: "",
      note: "",
    },
  })

  const watchCaseId = form.watch("caseId")
  const selectedItem = inventoryItems?.find(item => item.id === watchCaseId)
  const maxQuantity = selectedItem?.availableQuantity ?? 0

  // When there is only one case type, select it automatically
  useEffect(() => {
    const [onlyItem] = inventoryItems ?? []
    if (inventoryItems?.length === 1 && onlyItem && !form.getValues("caseId")) {
      form.setValue("caseId", onlyItem.id, { shouldValidate: true })
    }
  }, [inventoryItems, form])

  // Re-check an already typed quantity when the case type (and therefore the max) changes
  useEffect(() => {
    if (form.getValues("quantity") !== undefined) {
      void form.trigger("quantity")
    }
  }, [watchCaseId, maxQuantity, form])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  const handleSubmit = form.handleSubmit(async data => {
    if (!loggedInUserId) {
      toastError({ error: new Error("User not found") })
      return
    }

    const item = inventoryItems?.find(inventoryItem => inventoryItem.id === data.caseId)
    if (!item) {
      toastError({ error: new Error("Please select a case") })
      return
    }

    try {
      await createInventoryAdjustment({
        createdByUserId: loggedInUserId,
        organizationId,
        campaignId,
        type: CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT,
        quantity: data.quantity,
        note: data.note.trim(),
        // Needed so the adjustment is matched to its case type in the inventory
        pricePerBarCents: item.pricePerBarCents,
        barsPerCase: item.barsPerCase,
        // Price only (no cost / profit), used to reduce the expected revenue. Never displayed.
        pricePerCaseCents: item.pricePerCaseCents,
        totalPriceCents: Math.round(item.pricePerCaseCents * data.quantity),
      })
    } catch {
      toast.error("Failed to record inventory adjustment. Please try again.")
      return
    }

    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaigns.getSmallCardsMetrics.invalidate()
    void utils.casesTransactions.invalidate()

    toast.success(`Inventory adjustment recorded: -${data.quantity} case${data.quantity > 1 ? "s" : ""}`)
    form.reset()
    onOpenChange(false)
  })

  if (!loggedInUserId || !loggedInRole) {
    return null
  }

  const { isValid, isSubmitting, errors } = form.formState

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Record Inventory Adjustment"
      description="Reduce available inventory. The original delivery entry is not changed."
      icon={AdjustmentIcon}
      iconClassName="text-destructive"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="flex items-start gap-3">
            <FormFieldWrapper
              name="caseId"
              control={form.control}
              type="select"
              label="Case Type"
              className="flex-1"
              disabled={inventoryItems?.length === 1}
              options={
                inventoryItems?.map(item => ({
                  value: item.id,
                  label: item.name,
                })) ?? []
              }
            />

            <FormFieldWrapper
              name="quantity"
              control={form.control}
              type="number"
              label="Number of Cases"
              labelSmall=" (shortage/damages)"
              placeholder="e.g. 4"
              className="flex-1"
              disabled={!watchCaseId}
              description={watchCaseId && !errors.quantity ? `Maximum available to adjust: ${maxQuantity}` : null}
              required
            />
          </div>

          <FormFieldWrapper
            name="note"
            control={form.control}
            type="textarea"
            label="Note"
            labelSmall=" (required)"
            placeholder="e.g. Delivery was short by 4 cases."
            rows={2}
          />

          <div className="rounded-card bg-gray-50 p-4 text-xs text-muted-foreground">{INVENTORY_DISCLAIMER}</div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Adjustment"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  )
}
