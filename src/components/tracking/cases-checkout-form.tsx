"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Box } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { useSidebar } from "@/components/ui/sidebar/sidebar"
import { useLoggedInUser } from "@/hooks"
import { numberType } from "@/lib/zod"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { buildFifoCheckoutTransactions, getCaseName } from "@/utils/cases-transactions"
import { formatDate } from "@/utils/date"
import { toastError } from "@/utils/errors"
import { formatCurrency } from "@/utils/money"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

const formSchema = z.object({
  caseId: z.string(),
  quantity: numberType.int().positive().max(99, "Quantity cannot exceed 99"),
})

type FormValues = z.infer<typeof formSchema>

interface CasesCheckoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: { quantity: number }) => void
  campaignId: string
  organizationId: string
  user: User
}

export function CasesCheckoutForm({
  open,
  onOpenChange,
  onSubmit,
  campaignId,
  organizationId,
  user,
}: CasesCheckoutFormProps) {
  const { loggedInUserId, loggedInRole: role } = useLoggedInUser()
  const userId = user.id
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const displayParticipantUser = useMemo(
    () =>
      shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false) ? maskParticipantUserPii(user) : user,
    [role, user]
  )
  const { isMobile } = useSidebar()

  const [summary, setSummary] = useState<string | null>(null)

  const { data: casesTransactions = [] } = api.casesTransactions.getAllFromUserAtCampaign.useQuery(
    { userId, campaignId },
    { enabled: !!userId && !!campaignId }
  )
  const { data: inventoryItems } = api.casesTransactions.getCurrentInventory.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  })

  const utils = api.useUtils()
  const { mutate: createCasesCheckoutRecords, isPending: isCreating } = api.casesTransactions.createMany.useMutation({
    onSuccess: () => {
      void utils.campaigns.getHeaderMetrics.invalidate()
      void utils.campaigns.getSmallCardsMetrics.invalidate()
      void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()

      void utils.casesTransactions.invalidate()
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
      void utils.campaigns.getPrizesOverview.invalidate()
      void utils.campaigns.getParticipantsByEvent.invalidate()

      toast.success("Cases Checked Out Successfully")
      onOpenChange(false)
    },
  })

  const watchQuantity = form.watch("quantity")
  const watchCaseId = form.watch("caseId")

  useEffect(() => {
    const quantity = watchQuantity ?? 0
    const selected = inventoryItems?.inventoryItems.find(item => item.id === watchCaseId)

    if (selected) {
      const pricePerBar = selected.pricePerBarCents ? selected.pricePerBarCents / 100 : 0
      const barsPerCase = selected.barsPerCase ?? 60
      const totalSellPrice = pricePerBar * quantity * barsPerCase

      setSummary(`${quantity} case${quantity > 1 ? "s" : ""}: ${formatCurrency(totalSellPrice)}`)
    } else {
      setSummary(null)
    }
  }, [watchCaseId, watchQuantity, inventoryItems])

  const handleSubmit = form.handleSubmit(data => {
    if (!loggedInUserId) {
      toastError({ error: new Error("User not found") })
      return
    }

    const selectedItem = inventoryItems?.inventoryItems.find(item => item.id === data.caseId)
    if (!selectedItem) {
      toastError({ error: new Error("Please select a case") })
      return
    }

    if (selectedItem.availableQuantity < data.quantity) {
      toastError({
        error: new Error("Not enough cases available, please update inventory first."),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>Requested: {data.quantity}</p>
              <p>Available: {selectedItem.availableQuantity}</p>
            </div>
          ),
        },
      })
      return
    }

    const pricePerBarCents = selectedItem.pricePerBarCents
    const barsPerCase = selectedItem.barsPerCase

    // Validate both null/undefined and zero
    if (!pricePerBarCents || pricePerBarCents <= 0) {
      toast.error("Invalid price per bar. Please refresh the page and try again.")
      return
    }

    if (!barsPerCase || barsPerCase <= 0) {
      toast.error("Invalid number of bars per case. Please refresh the page and try again.")
      return
    }

    const pricePerCaseCents = Math.round(pricePerBarCents * barsPerCase)

    const transactions = buildFifoCheckoutTransactions({
      quantity: data.quantity,
      deliveredTransactionsAvailable: selectedItem.deliveredTransactionsAvailable,
      baseTransaction: {
        type: "checkout",
        organizationId,
        campaignId,
        createdByUserId: loggedInUserId,
        userId,
        barsPerCase,
        pricePerBarCents,
        pricePerCaseCents,
      },
    })

    createCasesCheckoutRecords(transactions)

    onSubmit?.({ quantity: data.quantity })
  })

  const predefinedQuantities = [1, 2, 3]
  const { isValid } = form.formState

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Check Out Cases"
      description="Assign cases to a participant"
      icon={Box}
      iconClassName="text-orange-500"
    >
      <div className="bg-gray-100 p-4 rounded-card mb-4">
        <p className="text-sm">
          <span className="font-medium">Participant: </span>
          <span className="text-gray-600">{getUserDisplayName(displayParticipantUser)}</span>
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <FormFieldWrapper
            name="caseId"
            control={form.control}
            type="select"
            label="Select Case"
            options={
              inventoryItems?.inventoryItems.map(item => {
                const availableQuantity = item.availableQuantity
                return {
                  value: item.id,
                  label: `${item.name}: ${availableQuantity} case${availableQuantity > 1 ? "s" : ""} available`,
                }
              }) ?? []
            }
            info="Select the case you want to check out"
          />
          {watchCaseId && (
            <>
              <div className="">
                <h3 className="text-sm font-medium">Choose the Number of Cases to Check Out</h3>
                <div className="flex gap-3 items-center flex-wrap">
                  {predefinedQuantities.map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => {
                        form.setValue("quantity", qty)
                        void form.trigger("quantity")
                      }}
                      className={`mt-2 mb-auto flex h-10 w-20 items-center justify-center rounded-control border ${
                        watchQuantity == qty ? "border-2 border-black" : "border-gray-200 bg-white"
                      }`}
                    >
                      <span className={`text-base ${watchQuantity == qty ? "font-semibold" : ""}`}>{qty}</span>
                    </button>
                  ))}

                  <FormFieldWrapper
                    name="quantity"
                    control={form.control}
                    type="number"
                    placeholder="Custom Quantity"
                    className={isMobile ? "w-full" : "flex-1"}
                  />
                </div>
              </div>

              <div className="rounded-card bg-gray-50 p-4">
                <h3 className="font-semibold text-base mb-2">Check Out Summary:</h3>
                <p className="font-medium text-medium">{summary}</p>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={!isValid}>
              {isCreating ? "Checking Out..." : "Check Out"}
            </Button>
          </div>
        </form>
      </Form>

      {casesTransactions && casesTransactions.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-card mt-4">
          <h3 className="text-base font-semibold mb-4">Check Out History:</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {casesTransactions.map((item, index) => (
              <div
                key={index}
                className="border border-orange-300 rounded-card p-4 bg-white flex justify-between items-start"
              >
                <div>
                  <p className="text-base font-medium">
                    {item.quantity} {item.quantity === 1 ? "Case" : "Cases"} Checked Out
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {getCaseName({ pricePerBarCents: item.pricePerBarCents ?? 0, barsPerCase: item.barsPerCase ?? 60 })}
                  </p>
                  <p className="text-muted-foreground text-sm">{formatDate(item.createdAt)}</p>
                </div>
                <div className="text-orange-500">
                  <Box size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
