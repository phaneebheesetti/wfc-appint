"use client"

import { CircleCheckBig, Clock, XCircleIcon } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type Stripe from "stripe"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentMethodsEnum } from "@/constants/stripe"
import { formatCentsToCurrency } from "@/utils/money"

const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 60000

export function PaymentSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [paymentIntent, setPaymentIntent] = useState<Stripe.PaymentIntent | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const pollStartedAtRef = useRef<number | null>(null)

  const pin = searchParams.get("pin")
  const paymentIntentId = searchParams.get("payment_intent")
  const stripeAccount = searchParams.get("stripeAccount")
  const consumerId = searchParams.get("consumerId")
  const consumerPaymentLogId = searchParams.get("consumerPaymentLogId")
  const shopId = searchParams.get("shopId")
  const amountCents = searchParams.get("amountCents")
  const paymentMethodParam = searchParams.get("paymentMethod")
  const firstName = searchParams.get("firstName")
  const backLabel = firstName ? `${firstName}'s` : "shop"
  const isBankPayment = paymentMethodParam === PaymentMethodsEnum.US_BANK_ACCOUNT

  const verifyPayment = useCallback(async () => {
    if (!paymentIntentId || !stripeAccount) {
      setIsVerifying(false)
      return
    }

    try {
      const response = await fetch("/api/stripe/payment/verification", {
        method: "POST",
        body: JSON.stringify({ paymentIntentId, stripeAccount }),
        headers: { "Content-Type": "application/json" },
      })
      const json = (await response.json()) as { data?: Stripe.PaymentIntent; error?: string }

      if (!response.ok) {
        toast.error(json.error ?? "Failed to verify payment")
        setIsVerifying(false)
        return
      }
      setPaymentIntent(json.data ?? null)
    } catch (_error) {
      toast.error("Failed to verify payment")
    } finally {
      setIsVerifying(false)
    }
  }, [paymentIntentId, stripeAccount])

  useEffect(() => {
    void verifyPayment()
  }, [verifyPayment])

  // keeps polling every 5s while still processing, and hard-stops at 60s
  useEffect(() => {
    if (paymentIntent?.status !== "processing") {
      pollStartedAtRef.current = null
      return
    }

    pollStartedAtRef.current ??= Date.now()

    const intervalId = setInterval(() => {
      if (Date.now() - (pollStartedAtRef.current ?? Date.now()) >= POLL_TIMEOUT_MS) {
        clearInterval(intervalId)
        setHasTimedOut(true)

        if (shopId && consumerPaymentLogId) {
          void fetch(`/api/shop/${shopId}/card-order/${consumerPaymentLogId}/timeout`, { method: "POST" }).catch(
            error => console.error("Failed to record polling timeout:", error)
          )
        }
        return
      }
      void verifyPayment()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [paymentIntent?.status, verifyPayment])

  const isShopOrder = !!consumerId && !!shopId && !!consumerPaymentLogId

  // Success: auto-redirect the shop customer on to their order confirmation page.
  useEffect(() => {
    if (!isShopOrder || isVerifying || paymentIntent?.status !== "succeeded") return

    void fetch(`/api/shop/${shopId}/card-order/${consumerPaymentLogId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, stripeAccount }),
    }).catch(error => console.error("Confirm call failed, webhook will still retry:", error))

    router.push(`/shop/${shopId}/order-confirmation/${consumerPaymentLogId}`)
  }, [isShopOrder, isVerifying, paymentIntent, shopId, consumerPaymentLogId, paymentIntentId, stripeAccount, router])

  const handleUpdatePaymentMethod = async () => {
    if (!consumerPaymentLogId || !shopId) return

    setIsRetrying(true)
    try {
      const response = await fetch(`/api/shop/${shopId}/card-order/${consumerPaymentLogId}/retry`, {
        method: "POST",
      })

      if (!response.ok) {
        toast.error("Something went wrong. Please try again.")
        setIsRetrying(false)
        return
      }

      const params = new URLSearchParams({
        pin: pin ?? "",
        consumerId: consumerId ?? "",
        consumerPaymentLogId: consumerPaymentLogId ?? "",
        shopId: shopId ?? "",
        ...(amountCents ? { amountCents } : {}),
        ...(firstName ? { firstName } : {}),
      })

      router.push(`/payment?${params.toString()}`)
    } catch (_error) {
      toast.error("Something went wrong. Please try again.")
      setIsRetrying(false)
    }
  }

  const handleReviewOrder = () => {
    if (!shopId || !consumerPaymentLogId) return
    router.push(`/shop/${shopId}?retryOrderId=${consumerPaymentLogId}`)
  }

  if (isVerifying || (isShopOrder && paymentIntent?.status === "processing" && !hasTimedOut)) {
    return (
      <div className="flex flex-col text-center items-center justify-start gap-4 p-4 w-full max-w-md">
        <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />

        <h1 className="w-full text-2xl font-semibold">Verifying Payment...</h1>

        {isShopOrder && isBankPayment && (
          <p className="text-sm">
            Confirming your payment with your bank... This can take a few extra seconds. Please stay on this page.
          </p>
        )}

        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  // Once polling has hard-stopped at 1 minute, this is the final resting screen
  if (isShopOrder && isBankPayment && hasTimedOut) {
    return (
      <div className="flex flex-col text-center items-center justify-start gap-4 p-4 w-full max-w-md">
        <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />

        <h1 className="w-full text-2xl font-semibold">Payment Processing</h1>

        <div className="items-center justify-center flex gap-2 text-base w-full">
          <Clock className="w-5 h-5 text-amber-600" />
          <p className="font-medium">
            Your bank payment is still being processed. Please note it may take up to 3 days to process your payment.
            We&apos;ll email you when the payment is complete.
          </p>
        </div>
        <Button variant="link" onClick={() => router.push(`/shop/${shopId}`)}>
          Back to {backLabel} page
        </Button>
      </div>
    )
  }

  if (!paymentIntent) {
    return (
      <div className="flex flex-col text-center items-center justify-start gap-4 p-4 w-full max-w-md">
        <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />

        <h1 className="w-full text-2xl font-semibold">Payment verification failed</h1>

        <div className="flex flex-col items-center justify-center gap-2 text-base w-full">
          <div className="flex items-center justify-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-600" />
            Please contact support.
          </div>
        </div>
      </div>
    )
  }

  // Shop order — success: brief redirecting state (useEffect above navigates away).
  if (isShopOrder && paymentIntent.status === "succeeded") {
    return (
      <div className="flex flex-col text-center items-center justify-center gap-4 p-4 w-full max-w-md">
        <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />
        <div className="items-center justify-center flex gap-2 text-base w-full">
          <CircleCheckBig className="w-5 h-5 text-green-600" />
          <p className="font-medium">Redirecting to shop...</p>
        </div>
      </div>
    )
  }

  // Shop order — anything else (failed, canceled, requires new payment method)
  if (isShopOrder) {
    return (
      <div className="flex flex-col text-center items-center justify-center gap-4 p-4 w-full max-w-md">
        <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />
        <h1 className="w-full text-2xl font-semibold">Payment failed</h1>
        <div className="items-start justify-center flex gap-2 text-base w-full">
          <XCircleIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="font-medium">
            We couldn&apos;t process your payment. No charges were made and your order has not been placed.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-64 mt-2">
          <Button onClick={handleUpdatePaymentMethod} disabled={isRetrying} className="w-full">
            {isRetrying ? "Please wait..." : "Update payment method"}
          </Button>
          <Button variant="link" onClick={handleReviewOrder} disabled={isRetrying} className="w-full">
            Review order
          </Button>
        </div>
      </div>
    )
  }

  const textByStatus: Record<
    Stripe.PaymentIntent.Status,
    { title: string; description: string; icon: React.ElementType }
  > = {
    canceled: {
      title: "Payment canceled",
      description: "Please contact support.",
      icon: XCircleIcon,
    },
    processing: {
      title: "Processing payment...",
      description: "We'll email you when payment is complete",
      icon: Clock,
    },
    requires_action: {
      title: "Payment requires action",
      description: "Please contact support.",
      icon: Clock,
    },
    requires_capture: {
      title: "Payment requires capture",
      description: "Please contact support.",
      icon: Clock,
    },
    requires_confirmation: {
      title: "Payment requires confirmation",
      description: "Please contact support.",
      icon: Clock,
    },
    requires_payment_method: {
      title: "Payment requires payment method",
      description: "Please contact support.",
      icon: Clock,
    },
    succeeded: {
      title: "Payment successful",
      description: "Thank you for your support!",
      icon: CircleCheckBig,
    },
  }

  const totalAmountCents = paymentIntent.amount
  const feeCents = paymentIntent.application_fee_amount ?? 0
  const subtotalCents = totalAmountCents - feeCents
  const campaignName = paymentIntent.metadata.campaignName
  const organizationName = paymentIntent.metadata.organizationName

  return (
    <div className="flex flex-col text-center items-center justify-center gap-4 p-4 w-full max-w-md">
      <Image src="/logo/wfc-logo.png" alt="logo" width={150} height={49} className="hidden md:block" />

      <h1 className="w-full text-2xl font-semibold">{textByStatus[paymentIntent.status].title}</h1>

      <div className="items-center justify-center flex gap-2 text-base w-full">
        <CircleCheckBig className="w-5 h-5 text-green-600" />
        <p className="font-medium">{textByStatus[paymentIntent.status].description}</p>
      </div>

      {paymentIntent.status === "succeeded" && (
        <div className="flex flex-col gap-2 text-left text-sm bg-gray-100 p-4 rounded-card w-full">
          <div className="font-medium">You just supported:</div>
          <div>{campaignName ?? "Fundraiser not found"}</div>
          <Separator />
          <div>Organization: {organizationName ?? "Not found"}</div>
          <div>Participant PIN: {pin}</div>
          <Separator />
          <div className="text-xs">Subtotal: {formatCentsToCurrency(subtotalCents)}</div>
          <div className="text-xs">Convenience Fee: {formatCentsToCurrency(feeCents)}</div>
          <div className="font-medium">Total: {formatCentsToCurrency(totalAmountCents)}</div>
        </div>
      )}
    </div>
  )
}
