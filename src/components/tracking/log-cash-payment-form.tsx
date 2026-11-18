"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleDollarSign, CreditCard, DollarSign } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { PaymentLogsStatusEnum, PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { useLoggedInUser } from "@/hooks"
import { currencyType } from "@/lib/zod"
import type { User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency, formatCurrency } from "@/utils/money"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

const formSchema = z.object({
  amount: currencyType,
})

type FormValues = z.infer<typeof formSchema>

interface LogCashPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: FormValues) => void
  campaignId: string
  organizationId: string
  user: User
}

const predefinedAmounts = ["$20.00", "$40.00", "$80.00", "$160.00", "$240.00"]

export function LogCashPaymentForm({
  open,
  onOpenChange,
  onSubmit,
  campaignId,
  organizationId,
  user,
}: LogCashPaymentFormProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(80)
  const { loggedInUserId, loggedInRole: role } = useLoggedInUser()
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery({ campaignId: campaignId })
  const userId = user.id

  const displayParticipantUser = useMemo(
    () =>
      shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false) ? maskParticipantUserPii(user) : user,
    [role, user]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: formatCurrency(80),
    },
  })
  const utils = api.useUtils()

  const { data: paymentLogs = [] } = api.paymentLogs.listByCampaignIdAndUserId.useQuery(
    { userId, campaignId },
    { enabled: !!userId && !!campaignId }
  )

  const { mutateAsync: createPaymentLogRecord } = api.paymentLogs.create.useMutation({
    onSuccess: () => {
      void utils.campaigns.getHeaderMetrics.invalidate()
      void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
      void utils.campaigns.getSmallCardsMetrics.invalidate()

      void utils.paymentLogs.invalidate()
      void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
      void utils.campaigns.getPrizesOverview.invalidate()
      void utils.campaigns.getParticipantsByEvent.invalidate()

      toast.success("Transaction added successfully")
      onOpenChange(false)
    },
  })

  const watchAmount = form.watch("amount")

  useEffect(() => {
    if (selectedAmount !== null) {
      form.setValue("amount", formatCurrency(selectedAmount))
    }
  }, [selectedAmount, form])

  const handleSubmit = async (data: FormValues) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    const amountCents = Math.round(+data.amount * 100)

    await createPaymentLogRecord({
      amountCents,
      campaignId,
      organizationId,
      createdByUserId: loggedInUserId,
      userId,
      type: PaymentLogsTypeEnum.CASH,
      status: PaymentLogsStatusEnum.COMPLETED,
    })

    onSubmit?.(data)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Log Cash Payment"
      description="Record a cash payment received from a participant"
      icon={CircleDollarSign}
      iconClassName="text-green-500"
    >
      <div className="bg-gray-100 p-4 rounded-card mb-4">
        <p className="text-sm">
          <span className="font-medium">Participant: </span>
          <span className="text-gray-600">{getUserDisplayName(displayParticipantUser)}</span>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6">
          <h3 className="text-sm font-medium">Choose or Enter an Amount to Pay</h3>
          <div className="flex gap-3 items-center flex-wrap">
            {predefinedAmounts.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setSelectedAmount(+amount.replace(/[^\d.-]/g, ""))}
                className={`flex h-10 w-20 items-center justify-center rounded-control border ${
                  watchAmount === amount ? "border-2 border-black" : "border-gray-200 bg-white"
                }`}
              >
                <span className={`text-base ${watchAmount === amount ? "font-semibold" : ""}`}>{amount}</span>
              </button>
            ))}
          </div>

          <FormFieldWrapper
            label="Enter payment amount"
            name="amount"
            control={form.control}
            type="currency"
            className="flex-1"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-black hover:bg-gray-800 text-white py-6"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Submitting..." : "Submit Payment"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-6"
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {paymentLogs && paymentLogs.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-card mt-4">
          <h3 className="text-base font-semibold mb-4">Cash Payment History:</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {paymentLogs.map((item, index) => (
              <div
                key={index}
                className="border border-green-300 rounded-card p-4 bg-white flex justify-between items-start"
              >
                <div>
                  <p className="text-base font-medium">{formatCentsToCurrency(item.amountCents)} - Payment Received</p>
                  <p className="text-gray-500">{formatDate(item.createdAt)}</p>
                </div>
                <div className="text-green-500">
                  {item.type === (PaymentLogsTypeEnum.CASH as string) ? (
                    <DollarSign size={16} />
                  ) : (
                    <CreditCard size={16} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
