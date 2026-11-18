"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Box, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoggedInUser } from "@/hooks"
import { numberType } from "@/lib/zod"
import { type User } from "@/server/db/schema"
import { TRPC_QUERY_ID_CHUNK_SIZE, api } from "@/trpc/react"
import { chunkArray } from "@/utils/array"
import {
  type FifoCheckoutTransaction,
  buildFifoCheckoutTransactions,
  deductFromDeliveredTransactions,
} from "@/utils/cases-transactions"
import { toastError } from "@/utils/errors"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

const formSchema = z.object({
  quantity: numberType.int().positive(),
  totalQuantity: numberType.int().positive(),
  caseId: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface CasesGroupCheckoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: { quantity: number }) => void
  campaignId: string
  organizationId: string
  userIds: string[]
}

export function CasesGroupCheckoutForm({
  open,
  onOpenChange,
  onSubmit,
  campaignId,
  organizationId,
  userIds,
}: CasesGroupCheckoutFormProps) {
  const utils = api.useUtils()
  const { loggedInUserId, loggedInRole: role } = useLoggedInUser()
  const { isMobile } = useSidebar()
  const [summary, setSummary] = useState<{ quantity: number; availableQuantity: number } | null>(null)

  const { data: inventoryItems } = api.casesTransactions.getCurrentInventory.useQuery(
    { campaignId },
    { enabled: !!campaignId }
  )

  // Passing every id to a single GET
  const userIdChunks = useMemo(() => chunkArray(userIds, TRPC_QUERY_ID_CHUNK_SIZE), [userIds])
  const userQueries = api.useQueries(t => userIdChunks.map(ids => t.users.listByIds({ ids })))
  const users = userQueries.flatMap(query => query.data ?? [])
  const isUsersLoading = userQueries.some(query => query.isLoading)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  })

  const { mutate: createCasesCheckoutRecords, isPending: isCreating } = api.casesTransactions.createMany.useMutation({
    onSuccess: () => {
      void utils.campaigns.getHeaderMetrics.invalidate()
      void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
      void utils.campaigns.getSmallCardsMetrics.invalidate()

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
      const totalQuantity = users.length * quantity

      form.setValue("totalQuantity", totalQuantity)
      void form.trigger("totalQuantity")

      setSummary({
        quantity: totalQuantity,
        availableQuantity: selected.availableQuantity,
      })
    } else {
      setSummary(null)
    }
  }, [watchCaseId, watchQuantity, inventoryItems, users.length, form])

  const handleSubmit = form.handleSubmit(data => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    const selectedItem = inventoryItems?.inventoryItems.find(item => item.id === data.caseId)
    if (!selectedItem) {
      toast.error("Please select a case")
      return
    }

    const totalQuantity = data.quantity * users.length

    if (selectedItem.availableQuantity < totalQuantity) {
      toastError({
        error: new Error("Not enough cases available, please update inventory first."),
        toastOptions: {
          description: (
            <div>
              <br />
              <p>Requested: {totalQuantity}</p>
              <p>Available: {selectedItem.availableQuantity}</p>
            </div>
          ),
        },
      })
      return
    }

    const pricePerBarCents = selectedItem.pricePerBarCents
    const barsPerCase = selectedItem.barsPerCase

    if (!pricePerBarCents || pricePerBarCents <= 0) {
      toast.error("Invalid price per bar. Please refresh the page and try again.")
      return
    }

    if (!barsPerCase || barsPerCase <= 0) {
      toast.error("Invalid bars per case. Please refresh the page and try again.")
      return
    }

    const pricePerCaseCents = Math.round(pricePerBarCents * barsPerCase)

    const allTransactions: FifoCheckoutTransaction[] = []
    let remainingDelivered = [...selectedItem.deliveredTransactionsAvailable]

    for (const user of users) {
      const userTransactions = buildFifoCheckoutTransactions({
        quantity: data.quantity,
        deliveredTransactionsAvailable: remainingDelivered,
        baseTransaction: {
          type: "checkout",
          organizationId,
          campaignId,
          createdByUserId: loggedInUserId,
          userId: user.id,
          barsPerCase,
          pricePerBarCents,
          pricePerCaseCents,
        },
      })

      allTransactions.push(...userTransactions)
      remainingDelivered = deductFromDeliveredTransactions(remainingDelivered, data.quantity)
    }

    createCasesCheckoutRecords(allTransactions)
    onSubmit?.({ quantity: data.quantity })
  })

  const predefinedQuantities = [1, 2, 3]
  const { isValid } = form.formState
  const exceedsAvailable = !!summary && summary.quantity > summary.availableQuantity

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Group Checkout"
      description="Assign cases to multiple participants at once"
      icon={Box}
      iconClassName="text-orange-500"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <FormFieldWrapper
            name="caseId"
            control={form.control}
            type="select"
            label="Select cases"
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
                <h3 className="text-sm font-medium">Choose the number of cases to checkout per participant</h3>
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
                <h3 className="font-semibold text-base mb-2">Check out cases to the following participants:</h3>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {isUsersLoading ? (
                    <>
                      <Skeleton className="h-4 w-32 bg-gray-200" />
                      <Skeleton className="h-4 w-48 bg-gray-200" />
                      <Skeleton className="h-4 w-36 bg-gray-200" />
                    </>
                  ) : (
                    users.map(u => {
                      const displayUser = shouldMaskParticipantPii(role) ? maskParticipantUserPii(u as User) : u
                      return <p key={u.id}>{getUserDisplayName(displayUser as User)}</p>
                    })
                  )}
                </div>
                {summary && summary.quantity > 0 && (
                  <div>
                    <Separator />
                    <div className="font-semibold mt-2">
                      Total {summary.quantity} case{summary.quantity > 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                <div>
                  {exceedsAvailable && summary && (
                    <div className="text-red-500">
                      Not enough cases available, please update inventory first.
                      <div>Requested: {summary.quantity}</div>
                      <div>Available: {summary.availableQuantity}</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-black hover:bg-gray-800 text-white py-6"
              disabled={!isValid || exceedsAvailable}
            >
              {isCreating ? <Loader2 className="animate-spin" /> : "Confirm & Check Out"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 py-6">
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Modal>
  )
}
