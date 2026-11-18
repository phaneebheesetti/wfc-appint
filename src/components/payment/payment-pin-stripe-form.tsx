"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import debounce from "lodash.debounce"
import { useCallback, useEffect, useMemo, useState } from "react"
import { NumericFormat } from "react-number-format"

import { type ValidatedPinWithSelectedCampaign } from "@/components/payment"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { InfoTooltip } from "@/components/ui/tooltip"
import { PaymentMethodsEnum } from "@/constants/stripe"
import { env } from "@/env"
import { type PaymentIntent } from "@/types/stripe"
import { cn } from "@/utils/cn"
import { formatCentsToCurrency, formatCurrencyToCents } from "@/utils/money"

interface PaymentPinStripeFormProps {
  validatedPinWithSelectedCampaign: ValidatedPinWithSelectedCampaign
  parentId?: string | null
  consumerId?: string | null
  consumerPaymentLogId?: string | null
  shopId?: string | null
  prefilledAmountCents?: string | null
  firstName?: string | null
}

const MIN_PAYMENT_CENTS = 100
const predefinedQuantities = ["$ 20.00", "$ 40.00", "$ 80.00", "$ 160.00"]
const formatCentsToAmountInput = (amountCents: number) => `$ ${(amountCents / 100).toFixed(2)}`

export function PaymentPinStripeForm({
  validatedPinWithSelectedCampaign,
  parentId,
  consumerId,
  consumerPaymentLogId,
  shopId,
  prefilledAmountCents,
  firstName,
}: PaymentPinStripeFormProps) {
  const isConsumerFlow = !!consumerId
  const allowAch = !!parentId

  const initialAmount = (() => {
    const parsed = prefilledAmountCents ? Number(prefilledAmountCents) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? formatCentsToAmountInput(parsed) : String(predefinedQuantities[2])
  })()

  const [amount, setAmount] = useState<string>(initialAmount)
  const [debouncedAmount, setDebouncedAmount] = useState<string>(initialAmount)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodsEnum>(PaymentMethodsEnum.CARD)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { campaign, userId } = validatedPinWithSelectedCampaign
  const { stripeAccount, campaignId, campaignName, organizationId, organizationName } = campaign ?? {}

  const stripePromise = useMemo(() => loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY, { stripeAccount }), [stripeAccount])

  const debouncedSetAmount = useMemo(() => debounce((value: string) => setDebouncedAmount(value), 800), [])

  useEffect(() => {
    return () => debouncedSetAmount.cancel()
  }, [debouncedSetAmount])

  const updatePaymentIntent = useCallback(async () => {
    try {
      setLoading(true)

      const paymentIntentResponse = await fetch("/api/stripe/payment/intent", {
        method: paymentIntent?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntent?.id,
          amount: formatCurrencyToCents(debouncedAmount),
          paymentMethod,
          stripeAccount,
          campaignId,
          campaignName,
          organizationId,
          organizationName,
          userId,
          ...(parentId ? { parentId } : {}),
          ...(consumerId ? { consumerId } : {}),
          ...(consumerPaymentLogId ? { consumerPaymentLogId } : {}),
        }),
      })

      const json = (await paymentIntentResponse.json()) as { data: PaymentIntent }

      setPaymentIntent(json.data)
    } catch (_) {
      setError("Failed to initiate payment. Please try again or contact support.")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [
    debouncedAmount,
    paymentIntent,
    paymentMethod,
    stripeAccount,
    campaignId,
    organizationId,
    userId,
    parentId,
    consumerId,
    consumerPaymentLogId,
  ])

  useEffect(() => {
    const amountCents = formatCurrencyToCents(debouncedAmount)
    if (amountCents < MIN_PAYMENT_CENTS) {
      setInitialLoading(false)
      setPaymentIntent(null)
      return
    }
    void (async () => {
      await updatePaymentIntent()
    })()
  }, [debouncedAmount, paymentMethod])

  if (initialLoading) {
    return (
      <div className="space-y-2 w-full">
        <Skeleton className="h-5 w-48" />
        <div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex gap-3 items-center">
          {predefinedQuantities.map((_, index) => (
            <Skeleton key={index} className="h-10 w-20" />
          ))}
        </div>
        <div className="mt-4">
          <Skeleton className="h-[150px] w-full" />
        </div>
        <Skeleton className="h-12 w-full mt-4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2 w-full">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2 w-full">
        <h3 className="text-sm font-medium">{isConsumerFlow ? "Amount to pay" : "Enter or select an amount to pay"}</h3>

        <NumericFormat
          thousandSeparator=","
          decimalSeparator="."
          prefix="$ "
          decimalScale={2}
          readOnly={isConsumerFlow}
          disabled={isConsumerFlow}
          className={cn(
            "flex h-11 w-full rounded-control border-[1px] border-input bg-input-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[1.5px] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            isConsumerFlow && "bg-gray-100 cursor-not-allowed"
          )}
          placeholder="Custom Amount"
          value={amount}
          onChange={e => {
            const value = e.target.value
            setAmount(value)
            debouncedSetAmount(value)
          }}
        />

        {!isConsumerFlow && (
          <div className="flex gap-3 items-center w-full">
            {predefinedQuantities.map(qty => {
              const isSelected = amount === qty || amount === qty.replace(/\.\d+$/, "")

              return (
                <button
                  key={qty}
                  type="button"
                  onClick={() => {
                    setAmount(qty)
                    debouncedSetAmount.cancel()
                    setDebouncedAmount(qty)
                  }}
                  className={`flex h-10 w-full items-center justify-center rounded-control border ${
                    isSelected ? "border-2 border-black" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className={`text-base ${isSelected ? "font-semibold" : ""}`}>{qty}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {formatCurrencyToCents(amount) < MIN_PAYMENT_CENTS && (
        <p className="text-sm text-muted-foreground">Enter $1.00 or more to continue</p>
      )}

      <div className={formatCurrencyToCents(amount) < MIN_PAYMENT_CENTS ? "hidden" : undefined}>
        <Elements
          stripe={stripePromise}
          options={{
            mode: "payment",
            amount: Math.max(formatCurrencyToCents(amount), MIN_PAYMENT_CENTS),
            currency: "usd",
            appearance: {
              theme: "stripe",
            },
            ...(allowAch ? {} : { paymentMethodTypes: ["card", "cashapp"] }),
          }}
        >
          <PaymentStripeWidget
            validatedPinWithSelectedCampaign={validatedPinWithSelectedCampaign}
            amountCents={formatCurrencyToCents(amount)}
            applicationFeeAmountCents={paymentIntent?.application_fee_amount ?? 0}
            clientSecret={paymentIntent?.client_secret ?? ""}
            loading={loading}
            minPaymentCents={MIN_PAYMENT_CENTS}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            consumerId={consumerId}
            consumerPaymentLogId={consumerPaymentLogId}
            shopId={shopId}
            firstName={firstName}
          />
        </Elements>
      </div>
    </>
  )
}

interface PaymentStripeWidgetProps {
  validatedPinWithSelectedCampaign?: ValidatedPinWithSelectedCampaign
  amountCents: number
  applicationFeeAmountCents: number
  clientSecret: string
  loading: boolean
  minPaymentCents: number
  paymentMethod: PaymentMethodsEnum
  onPaymentMethodChange: (paymentMethod: PaymentMethodsEnum) => void
  consumerId?: string | null
  consumerPaymentLogId?: string | null
  shopId?: string | null
  firstName?: string | null
}

const PaymentStripeWidget = ({
  validatedPinWithSelectedCampaign,
  amountCents = 0,
  applicationFeeAmountCents = 0,
  clientSecret,
  loading,
  minPaymentCents,
  paymentMethod,
  onPaymentMethodChange,
  consumerId,
  consumerPaymentLogId,
  shopId,
  firstName,
}: PaymentStripeWidgetProps) => {
  const [errorMessage, setErrorMessage] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const stripe = useStripe()
  const elements = useElements()

  const onSubmit = async () => {
    setSubmitting(true)

    if (!stripe || !elements) {
      return
    }
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setErrorMessage(submitError.message)
      setSubmitting(false)
      return
    }

    const { campaign, userId, pin } = validatedPinWithSelectedCampaign ?? {}
    const { campaignId, organizationId, stripeAccount } = campaign ?? {}

    const searchParams = new URLSearchParams({
      pin: pin ?? "",
      userId: userId ?? "",
      campaignId: campaignId ?? "",
      organizationId: organizationId ?? "",
      stripeAccount: stripeAccount ?? "",
      ...(consumerId ? { consumerId } : {}),
      ...(consumerPaymentLogId ? { consumerPaymentLogId } : {}),
      ...(shopId ? { shopId } : {}),
      ...(shopId ? { amountCents: String(amountCents) } : {}),
      ...(shopId ? { paymentMethod } : {}),
      ...(firstName ? { firstName } : {}),
    })

    const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/payment/success?${searchParams.toString()}`

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: redirectUrl,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    }

    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
        onChange={e => {
          const stripePaymentType = e.value?.type

          //map wallet payment methods to CARD since they use the same convenience fee structure
          const paymentMethodMap: Record<string, PaymentMethodsEnum> = {
            card: PaymentMethodsEnum.CARD,
            google_pay: PaymentMethodsEnum.CARD,
            apple_pay: PaymentMethodsEnum.CARD,
            link: PaymentMethodsEnum.CARD,
            cashapp: PaymentMethodsEnum.CARD,
            us_bank_account: PaymentMethodsEnum.US_BANK_ACCOUNT,
          }

          const mappedPaymentMethod = paymentMethodMap[stripePaymentType ?? ""] ?? PaymentMethodsEnum.DEFAULT

          if (mappedPaymentMethod !== paymentMethod) {
            onPaymentMethodChange(mappedPaymentMethod)
          }
        }}
      />

      {errorMessage && <p className="text-red-500">{errorMessage}</p>}

      <Separator />

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between font-medium">
          Subtotal<span>{formatCentsToCurrency(amountCents)} </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <div className="flex items-center gap-2">
            Convenience Fee
            <InfoTooltip content="Convenience fee is applied to manage your digital payment securely." side="top" />
          </div>

          {loading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span>{formatCentsToCurrency(applicationFeeAmountCents)} </span>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-medium">
        Total
        {loading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span>{formatCentsToCurrency(amountCents + applicationFeeAmountCents)} </span>
        )}
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={loading || submitting || amountCents < minPaymentCents}
        className="text-base"
      >
        {submitting
          ? "Processing..."
          : `Pay ${loading ? "..." : formatCentsToCurrency(amountCents + applicationFeeAmountCents)}`}
      </Button>
    </div>
  )
}
