import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { stripe } from "@/lib/stripe"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  stripeAccountId: z.string(),
  enablePayouts: z.boolean().optional().default(false),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { stripeAccountId, enablePayouts = false } = body

  const account = await stripe.accounts.retrieve(stripeAccountId)
  if (!account) {
    return NextResponse.json({ error: "Stripe account not found" }, { status: 404 })
  }

  const disable_stripe_user_authentication = false

  const accountSession = await stripe.accountSessions.create({
    account: stripeAccountId,
    components: {
      payments: {
        enabled: true,
      },
      payment_details: {
        enabled: true,
      },
      payouts: {
        enabled: true,
        features: {
          instant_payouts: enablePayouts,
          standard_payouts: enablePayouts,
          edit_payout_schedule: true,
          disable_stripe_user_authentication,
        },
      },
      balances: {
        enabled: true,
        features: {
          instant_payouts: enablePayouts,
          standard_payouts: enablePayouts,
          edit_payout_schedule: true,
          disable_stripe_user_authentication,
        },
      },
      notification_banner: {
        enabled: true,
        features: {
          disable_stripe_user_authentication,
        },
      },

      // Connect
      account_onboarding: {
        enabled: true,
        features: {
          disable_stripe_user_authentication,
        },
      },
      account_management: {
        enabled: true,
        features: {
          disable_stripe_user_authentication,
        },
      },
    },
  })

  return NextResponse.json({ data: { client_secret: accountSession.client_secret } }, { status: 200 })
})
