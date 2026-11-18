import { headers } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

import { PaymentLogsStatusEnum } from "@/constants/payment-logs"
import { env } from "@/env"
import { stripe } from "@/lib/stripe"
import { processPaymentIntentResult } from "@/server/services/stripe/process-payment-intent"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (req: NextRequest) => {
  const buf = await req.arrayBuffer()
  const body = Buffer.from(buf)

  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature header" }, { status: 400 })
  }

  const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)

  switch (event.type) {
    case "payment_intent.succeeded":
      await processPaymentIntentResult(event.data.object, PaymentLogsStatusEnum.COMPLETED)
      break
    case "payment_intent.payment_failed":
      await processPaymentIntentResult(event.data.object, PaymentLogsStatusEnum.FAILED)
      break
    case "payment_intent.processing":
      await processPaymentIntentResult(event.data.object, PaymentLogsStatusEnum.PENDING)
      break
  }

  return NextResponse.json({ data: null, message: "Webhook received" }, { status: 200 })
})
