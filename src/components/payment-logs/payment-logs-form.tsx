"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { currencyType } from "@/lib/zod"
import { type PaymentLog } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatCentsToCurrency } from "@/utils/money"

const formSchema = z.object({
  amount: currencyType,
})

type FormValues = z.infer<typeof formSchema>

interface PaymentLogsFormProps {
  paymentLog: PaymentLog
  onUpdate?: () => void
  onBack?: () => void
}

export function PaymentLogsForm({ paymentLog, onUpdate, onBack }: PaymentLogsFormProps) {
  const utils = api.useUtils()

  const { mutateAsync: updatePaymentLog } = api.paymentLogs.update.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: formatCentsToCurrency(paymentLog.amountCents ?? 0),
    },
  })

  const onSubmit = async (data: FormValues) => {
    if (paymentLog) {
      await handleUpdatePaymentLog(data)
    }
  }

  const handleUpdatePaymentLog = async (data: FormValues) => {
    const amountCents = +data.amount * 100

    await updatePaymentLog({
      id: paymentLog.id,
      amountCents,
    })

    toast.success(`Transaction updated successfully`)

    void utils.paymentLogs.invalidate()
    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()

    onUpdate?.()
  }

  const fields: FormField<FormValues>[] = [
    {
      name: "amount",
      label: "Amount",
      type: "currency",
      required: true,
    },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {fields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        <div className={cn("flex justify-end gap-2", paymentLog && "justify-start")}>
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
            {paymentLog && <Save />}

            {paymentLog
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
