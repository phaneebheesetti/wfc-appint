import { type NextRequest, NextResponse } from "next/server"
import { type Stripe } from "stripe"
import { z } from "zod"

import { APP_NAME } from "@/constants/app"
import { env } from "@/env"
import { stripe } from "@/lib/stripe"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  businessProfile: z.object({
    name: z.string(),
    support_address: z.object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    }),
  }),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { businessProfile } = body

  const response = await fetch("https://api.stripe.com/v1/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": env.STRIPE_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      country: "US",
    }),
  })

  const stripeAccount = (await response.json()) as Stripe.Account

  await stripe.accounts.update(stripeAccount.id, {
    business_profile: {
      ...businessProfile,
      url: env.NODE_ENV === "production" ? env.APP_URL : "https://fundraising-app.worldsfinestchocolate.com",
      support_url: env.NODE_ENV === "production" ? env.APP_URL : "https://fundraising-app.worldsfinestchocolate.com",
      product_description: `${APP_NAME} App helps schools and community organizations run chocolate‑bar fundraisers, track sales and participants, and collect payments securely online. Supporters are charged immediately at checkout, and proceeds are routed to the organization via Stripe Connect.`,
    },
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },
    settings: {
      card_payments: {
        statement_descriptor_prefix: "CHOCOFUND",
        statement_descriptor_prefix_kana: null,
        statement_descriptor_prefix_kanji: null,
      },
      payments: {
        statement_descriptor: "CHOCOLATE FUNDRAISER",
        statement_descriptor_kana: undefined,
        statement_descriptor_kanji: undefined,
      },
      payouts: {
        schedule: {
          interval: "manual",
        },
      },
    },
  })

  //domain registration for new accounts
  //domainName only accepts hostname (without https or trailing slash)
  const domainName = new URL(env.APP_URL).hostname

  //domain registration skipped when running locally
  //for testing in local, use VS Code Port Forwarder and manually register that domain
  //refer to documentation: https://docs.stripe.com/payments/payment-methods/pmd-registration?dashboard-or-api=api&lang=curl#register-your-domain-while-using-connect
  if (domainName !== "localhost") {
    //try-catch wrapper so a failed domain registration does not break stripe account creation
    try {
      await stripe.paymentMethodDomains.create(
        {
          domain_name: domainName,
        },
        {
          stripeAccount: stripeAccount.id,
        }
      )
    } catch (error) {
      console.error(`Failed to register payment method domain for Stripe account ${stripeAccount.id}`, error)
    }
  }

  return NextResponse.json({ data: stripeAccount }, { status: 200 })
})
