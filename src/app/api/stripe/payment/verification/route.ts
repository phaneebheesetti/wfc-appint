import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { stripe } from "@/lib/stripe"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  paymentIntentId: z.string(),
  stripeAccount: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { paymentIntentId, stripeAccount } = body

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount })

  return NextResponse.json({ data: paymentIntent }, { status: 200 })
})
