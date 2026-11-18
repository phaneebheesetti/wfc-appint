"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PackagePlus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { CasesTransactionsTypeEnum, INVENTORY_DISCLAIMER } from "@/constants/cases-transactions"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { currencyType, numberType } from "@/lib/zod"
import { api } from "@/trpc/react"
import { getCaseName } from "@/utils/cases-transactions"
import { formatCurrency, formatCurrencyToCents, parseCurrency } from "@/utils/money"

const DEFAULT_BARS_PER_CASE = 40

const formSchema = z
  .object({
    casesBilled: numberType.int().nonnegative().optional(),
    casesFree: numberType.int().nonnegative().optional(),
    barsPerCase: numberType.int(),
    pricePerCase: currencyType,
    profitPerCase: currencyType,
  })
  .superRefine((data, ctx) => {
    const issue = {
      code: z.ZodIssueCode.custom,
      message: "Enter at least 1 case",
    }

    const isBilledEmpty = data.casesBilled === undefined
    const free = data.casesFree ?? 0
    const billed = data.casesBilled ?? 0
    const onlyFreeCases = billed === 0 && free > 0

    if ((data.casesBilled ?? 0) === 0 && (data.casesFree ?? 0) === 0) {
      ctx.addIssue({ ...issue, path: ["casesBilled"] })
    }

    if (isBilledEmpty && free > 0) {
      ctx.addIssue({
        ...issue,
        message: "Enter 0, if you are adding just free cases",
        path: ["casesBilled"],
      })
    }

    if ((data.barsPerCase ?? 0) == 0) {
      ctx.addIssue({ ...issue, message: "Add atleast 1 bar per case", path: ["barsPerCase"] })
    }

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
  })

type FormValues = z.infer<typeof formSchema>

interface CasesDeliveredFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
}

export function CasesDeliveredForm({ open, onOpenChange, campaignId, organizationId }: CasesDeliveredFormProps) {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()

  const [summary, setSummary] = useState({
    casesBilled: 0,
    casesFree: 0,
    totalCostBilled: 0,
    totalSellPrice: 0,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      casesBilled: undefined,
      casesFree: 0,
      barsPerCase: DEFAULT_BARS_PER_CASE,
      pricePerCase: "$0",
      profitPerCase: "$0",
    },
  })

  const utils = api.useUtils()

  const watchCasesBilled = form.watch("casesBilled")
  const watchCasesFree = form.watch("casesFree")
  const watchPricePerCase = form.watch("pricePerCase")
  const watchProfitPerCase = form.watch("profitPerCase")
  const watchBarsPerCase = form.watch("barsPerCase")

  const caseName = useMemo(() => {
    const barsPerCase = watchBarsPerCase
    const profitPerCaseCents = formatCurrencyToCents(watchProfitPerCase) || 0
    const pricePerCaseCents = (formatCurrencyToCents(watchPricePerCase) || 0) + profitPerCaseCents

    const pricePerBarCents = Math.round(pricePerCaseCents / barsPerCase)

    return getCaseName({ pricePerBarCents, barsPerCase })
  }, [watchBarsPerCase, watchPricePerCase, watchProfitPerCase])

  useEffect(() => {
    if (form.formState.isSubmitted) {
      void form.trigger(["casesBilled", "casesFree", "pricePerCase"])
    }
  }, [watchCasesBilled, watchCasesFree, form.formState.isSubmitted])

  useEffect(() => {
    const casesBilled = Number(watchCasesBilled ?? 0)
    const casesFree = Number(watchCasesFree ?? 0)
    const profitPerCase = parseCurrency(watchProfitPerCase ?? 0)
    const pricePerCase = parseCurrency(watchPricePerCase ?? 0) + profitPerCase
    const costPerCase = pricePerCase - profitPerCase

    setSummary({
      casesBilled,
      casesFree,
      totalCostBilled: costPerCase * casesBilled,
      totalSellPrice: pricePerCase * (casesBilled + casesFree),
    })
  }, [watchCasesBilled, watchCasesFree, watchPricePerCase, watchProfitPerCase])

  const { mutateAsync: createCasesDeliveredRecord } = api.casesTransactions.create.useMutation()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  const onSubmit = async (data: FormValues) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    const profitPerCaseNum = parseCurrency(data.profitPerCase)
    const pricePerCaseNum = parseCurrency(data.pricePerCase) + profitPerCaseNum
    const costPerCaseNum = pricePerCaseNum - profitPerCaseNum

    const pricePerCaseCents = Math.round(pricePerCaseNum * 100)
    const profitPerCaseCents = Math.round(profitPerCaseNum * 100)
    const costPerCaseCents = Math.round(costPerCaseNum * 100)
    const pricePerBarCents = Math.round(pricePerCaseCents / data.barsPerCase)

    const billedPromise =
      (data.casesBilled ?? 0) > 0
        ? createCasesDeliveredRecord({
            createdByUserId: loggedInUserId,
            organizationId,
            campaignId,
            type: CasesTransactionsTypeEnum.DELIVERED,
            quantity: data.casesBilled!,
            pricePerCaseCents,
            totalPriceCents: Math.round(pricePerCaseCents * data.casesBilled!),
            profitPerCaseCents,
            totalProfitCents: Math.round(profitPerCaseCents * data.casesBilled!),
            costPerCaseCents,
            totalCostCents: Math.round(costPerCaseCents * data.casesBilled!),
            pricePerBarCents,
            barsPerCase: data.barsPerCase,
          })
        : Promise.resolve()

    // Free cases: org is not charged — profit equals full price, cost is zero
    const freePromise =
      (data.casesFree ?? 0) > 0
        ? createCasesDeliveredRecord({
            createdByUserId: loggedInUserId,
            organizationId,
            campaignId,
            type: CasesTransactionsTypeEnum.DELIVERED,
            quantity: data.casesFree!,
            pricePerCaseCents,
            totalPriceCents: Math.round(pricePerCaseCents * data.casesFree!),
            profitPerCaseCents: pricePerCaseCents,
            totalProfitCents: Math.round(pricePerCaseCents * data.casesFree!),
            costPerCaseCents: 0,
            totalCostCents: 0,
            pricePerBarCents,
            barsPerCase: data.barsPerCase,
          })
        : Promise.resolve()

    try {
      await Promise.all([billedPromise, freePromise])
    } catch {
      toast.error("Failed to add cases. Please try again.")
      return
    }

    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaigns.getSmallCardsMetrics.invalidate()
    void utils.casesTransactions.invalidate()

    toast.success("Cases Delivered Added Successfully")
    form.reset()
    onOpenChange(false)
  }

  if (!loggedInUserId || !loggedInRole) {
    return null
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Cases Delivered"
      description="Record delivery of cases to the organization"
      icon={PackagePlus}
      iconClassName="text-green-500"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <div className="flex items-start gap-3">
            <FormFieldWrapper
              name="casesBilled"
              label="Cases to be delivered"
              labelSmall=" (billed)"
              type="number"
              control={form.control}
              className="flex-1"
              required
            />
            <FormFieldWrapper
              name="casesFree"
              label="Cases to be delivered"
              labelSmall=" (free)"
              type="number"
              control={form.control}
              className="flex-1"
            />
          </div>

          <FormFieldWrapper
            name="barsPerCase"
            label="Bars per Case"
            labelSmall={caseName ? ` (${caseName})` : ""}
            type="number"
            control={form.control}
            required
          />

          <div className="flex items-start gap-3">
            <FormFieldWrapper
              name="pricePerCase"
              label="Cost per Case"
              type="currency"
              control={form.control}
              className="flex-1"
              required
            />
            <FormFieldWrapper
              name="profitPerCase"
              label="Profit per Case"
              type="currency"
              control={form.control}
              className="flex-1"
              required
            />
          </div>

          <div className="rounded-card bg-gray-50 p-4">
            <h3 className="font-semibold text-base mb-2">Cases Delivered Summary:</h3>
            <div className="space-y-1">
              {summary.casesBilled > 0 && (
                <p>
                  {summary.casesBilled} billed {summary.casesBilled === 1 ? "case" : "cases"}
                </p>
              )}
              {summary.casesFree > 0 && (
                <p>
                  {summary.casesFree} free {summary.casesFree === 1 ? "case" : "cases"}
                </p>
              )}
              {summary.casesBilled === 0 && summary.casesFree === 0 && <p>0 cases</p>}

              {/* {COST_VISIBLE_ROLES.includes(loggedInRole) && (
                <p>Production Cost: {formatCurrency(summary.totalCostBilled)}</p>
              )} */}

              <p className="font-semibold">Total Sell Price: {formatCurrency(summary.totalSellPrice)}</p>
            </div>
          </div>

          {env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true" && (
            <div className="rounded-card bg-gray-50 p-4 text-xs text-muted-foreground">{INVENTORY_DISCLAIMER}</div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Adding..." : "Add Cases Delivered"}
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  )
}
