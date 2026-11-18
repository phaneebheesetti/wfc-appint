import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { stripe } from "@/lib/stripe"
import { processPaymentIntentResult } from "@/server/services/stripe/process-payment-intent"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  paymentIntentId: z.string(),
  stripeAccount: z.string(),
})

/**
 * Client-triggered fallback finalize, called from payment-success.tsx the moment
 * the browser independently confirms success via Stripe verification/polling.
 * Exists because webhook delivery can be slow.
 * Re-fetches the PaymentIntent from Stripe directly, then defers
 * to the exact same shared logic the webhook uses.
 */
export const POST = withSentry(async (req: NextRequest) => {
  const { paymentIntentId, stripeAccount } = bodySchema.parse(await req.json())

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount })

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not succeeded." }, { status: 409 })
  }

  await processPaymentIntentResult(paymentIntent, PaymentLogsStatusEnum.COMPLETED)

  return NextResponse.json({ data: { finalized: true } }, { status: 200 })
})
