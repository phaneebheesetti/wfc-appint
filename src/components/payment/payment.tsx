"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import {
  PaymentPinConfirmation,
  PaymentPinForm,
  PaymentPinStripeForm,
  type ValidatedPinWithCampaigns,
  type ValidatedPinWithSelectedCampaign,
} from "@/components/payment"
import { APP_NAME } from "@/constants/app"

export function Payment() {
  const searchParams = useSearchParams()
  const parentId = searchParams.get("parentId")
  const consumerId = searchParams.get("consumerId")
  const consumerPaymentLogId = searchParams.get("consumerPaymentLogId")
  const shopId = searchParams.get("shopId")
  const amountCents = searchParams.get("amountCents")
  const firstName = searchParams.get("firstName")

  const [step, setStep] = useState<"pin" | "confirmation" | "form">("pin")
  const [validatedPinWithCampaigns, setValidatedPinWithCampaigns] = useState<ValidatedPinWithCampaigns | null>(null)
  const [validatedPinWithSelectedCampaign, setValidatedPinWithSelectedCampaign] =
    useState<ValidatedPinWithSelectedCampaign | null>(null)

  const onPinWithCampaignsValidated = (validatedPinWithCampaigns: ValidatedPinWithCampaigns) => {
    setValidatedPinWithCampaigns(validatedPinWithCampaigns)
    setStep("confirmation")
  }

  const onConfirmedByUser = (validatedPinWithSelectedCampaign: ValidatedPinWithSelectedCampaign) => {
    setValidatedPinWithSelectedCampaign(validatedPinWithSelectedCampaign)
    setStep("form")
  }

  const onConfirmationCancelled = () => {
    setValidatedPinWithCampaigns(null)
    setStep("pin")
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 max-w-md">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Welcome to the {APP_NAME} Payment Portal</h1>

        {step === "pin" && (
          <div className="items-center justify-center gap-4 text-base text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms-of-service" className="underline" target="_blank" rel="noreferrer">
              Terms of Service
            </Link>{" "}
            and acknowledge that you understand the{" "}
            <Link href="/privacy-policy" className="underline" target="_blank" rel="noreferrer">
              Privacy Policy
            </Link>
            .
          </div>
        )}
      </div>

      <PaymentPinForm onPinWithCampaignsValidated={onPinWithCampaignsValidated} step={step} />

      {step === "confirmation" && validatedPinWithCampaigns && (
        <PaymentPinConfirmation
          onConfirmedByUser={onConfirmedByUser}
          onConfirmationCancelled={onConfirmationCancelled}
          validatedPinWithCampaigns={validatedPinWithCampaigns}
        />
      )}

      {step === "form" && validatedPinWithSelectedCampaign && (
        <PaymentPinStripeForm
          validatedPinWithSelectedCampaign={validatedPinWithSelectedCampaign}
          parentId={parentId}
          consumerId={consumerId}
          consumerPaymentLogId={consumerPaymentLogId}
          shopId={shopId}
          prefilledAmountCents={amountCents}
          firstName={firstName}
        />
      )}
    </div>
  )
}
