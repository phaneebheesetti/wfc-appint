"use client"

import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { type Control, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Input } from "@/components/ui/input"
import { currencyType, numberType } from "@/lib/zod"
import { api } from "@/trpc/react"
import { getCaseName, type sfOrderDetails } from "@/utils/cases-transactions"
import { cn } from "@/utils/cn"
import { formatCurrencyToCents, parseCurrency } from "@/utils/money"

// Shared schema + UI for the inventory step. Used by the FC onboarding Step 3 and the Add-Fundraiser popup.
export const productSchema = z
  .object({
    casesBilled: numberType.int().nonnegative().optional(),
    casesFree: numberType.int().nonnegative().optional(),
    barsPerCase: numberType.int().positive(),
    pricePerCase: currencyType,
    profitPerCase: currencyType,
    sfProductName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const issue = {
      code: z.ZodIssueCode.custom,
    }

    const billed = data.casesBilled ?? 0
    const free = data.casesFree ?? 0
    const onlyFreeCases = billed === 0 && free > 0

    if (billed + free > 0) {
      if (!onlyFreeCases && parseCurrency(data.pricePerCase) <= 0) {
        ctx.addIssue({
          ...issue,
          message: "Cost per case must be greater than $0",
          path: ["pricePerCase"],
        })
      }

      if (parseCurrency(data.profitPerCase) <= 0) {
        ctx.addIssue({
          ...issue,
          message: "Profit per case must be greater than $0",
          path: ["profitPerCase"],
        })
      }
    }
  })

export const inventoryFormSchema = z.object({
  products: z.array(productSchema).min(1, "Add at least one product"),
})

export type ProductValues = z.infer<typeof productSchema>
export type InventoryFormValues = z.infer<typeof inventoryFormSchema>

export const DEFAULT_PRODUCT: ProductValues = {
  casesBilled: undefined,
  casesFree: undefined,
  barsPerCase: 40,
  pricePerCase: "$0",
  profitPerCase: "$0",
}

export function InventoryProductsFields({
  control,
  onSfOrderId,
  orderId,
}: {
  control: Control<InventoryFormValues>
  onSfOrderId?: (sfOrderId: string | undefined) => void
  orderId?: string | null
}) {
  const utils = api.useUtils()
  const [orderNumber, setOrderNumber] = useState(orderId ?? "")
  const { fields, append, remove, replace } = useFieldArray({ control, name: "products" })

  const handleOrderLookup = async () => {
    const orderDetails = await utils.casesTransactions.getBySFId.fetch({ orderId: orderNumber })
    const products: Array<sfOrderDetails> = orderDetails ? Object.values(orderDetails) : []

    if (products.length > 0) {
      onSfOrderId?.(products[0]?.orderId)
      replace(
        products.map((product: sfOrderDetails) => ({
          casesBilled: product?.billedCases ?? 0,
          casesFree: product.freeCases ?? 0,
          barsPerCase: product.barsPerCase,
          pricePerCase: `$${product.costPerCase.toFixed(2)}`,
          profitPerCase: `$${(product.profitPerCase ?? 0).toFixed(2)}`,
          sfProductName: product.product,
        }))
      )
    } else {
      onSfOrderId?.(undefined)
      toast.error("No orders associated with this ID.")
    }
  }

  return (
    <>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-600">Salesforce Order Lookup</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enter your Phoenix order number to auto-populate inventory, mix, and pricing details.
        </p>
        <div className="flex gap-2 mt-3">
          <Input
            placeholder="e.g. O-0000581234"
            value={orderNumber}
            disabled={typeof orderId === "string"}
            onChange={e => setOrderNumber(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={handleOrderLookup}>
            Look up
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <ProductCard
            key={field.id}
            index={index}
            control={control}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => append(DEFAULT_PRODUCT)}>
        <Plus /> Add Product
      </Button>
    </>
  )
}

function ProductCard({
  index,
  control,
  canRemove,
  onRemove,
}: {
  index: number
  control: Control<InventoryFormValues>
  canRemove: boolean
  onRemove: () => void
}) {
  const [open, setOpen] = useState(true)
  const {
    trigger,
    formState: { isSubmitted },
  } = useFormContext<InventoryFormValues>()

  // Live values drive the "(… Bar Case - N count)" subtitle as the FC types.
  const values = useWatch({ control, name: `products.${index}` })
  const barsPerCase = Number(values?.barsPerCase) || 0
  const costPerCaseCents = formatCurrencyToCents(values?.pricePerCase ?? "$0") || 0
  const profitPerCaseCents = formatCurrencyToCents(values?.profitPerCase ?? "$0") || 0
  const pricePerBarCents = barsPerCase > 0 ? Math.round((costPerCaseCents + profitPerCaseCents) / barsPerCase) : 0
  const caseName = getCaseName({ pricePerBarCents, barsPerCase })

  const productFields: FormField<InventoryFormValues>[] = [
    {
      name: `products.${index}.casesBilled`,
      label: "Cases to be delivered",
      labelSmall: " (billed)",
      type: "number",
      required: true,
      className: "col-span-3",
    },
    {
      name: `products.${index}.casesFree`,
      label: "Cases to be delivered",
      labelSmall: " (free)",
      type: "number",
      className: "col-span-3",
    },
    {
      name: `products.${index}.barsPerCase`,
      label: "Bars per Case",
      type: "number",
      required: true,
      className: "col-span-2",
    },
    {
      name: `products.${index}.pricePerCase`,
      label: "Cost per Case",
      type: "currency",
      required: true,
      className: "col-span-2",
    },
    {
      name: `products.${index}.profitPerCase`,
      label: "Profit per Case",
      type: "currency",
      required: true,
      className: "col-span-2",
    },
  ]

  useEffect(() => {
    if (isSubmitted) {
      void trigger([`products.${index}.pricePerCase`, `products.${index}.profitPerCase`])
    }
  }, [values?.casesBilled, values?.casesFree, index, trigger, isSubmitted])

  return (
    <div className="rounded-card border bg-muted/20 shadow-elev-1">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="font-semibold">Product {index + 1}</span>
          <span className="text-sm text-muted-foreground">({caseName})</span>
        </button>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onRemove}
            aria-label={`Remove product ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        <button type="button" onClick={() => setOpen(prev => !prev)} aria-label="Toggle product">
          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:grid-cols-6">
          {productFields.map(field => (
            <FormFieldWrapper key={field.name} {...field} control={control} />
          ))}
        </div>
      )}
    </div>
  )
}
