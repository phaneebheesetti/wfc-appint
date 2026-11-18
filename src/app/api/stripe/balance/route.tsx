import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { stripe } from "@/lib/stripe"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  stripeAccountId: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { stripeAccountId } = body

  const account = await stripe.accounts.retrieve(stripeAccountId)
  if (!account) {
    return NextResponse.json({ error: "Stripe account not found" }, { status: 404 })
  }

  const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId })

  return NextResponse.json({ data: balance }, { status: 200 })
})
