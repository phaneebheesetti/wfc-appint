import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { type MCCEnum, PaymentMethodsEnum, getPaymentApplicationFeeAmount } from "@/constants/stripe"
import { stripe } from "@/lib/stripe"
import { type SupabaseOrganizationUser, type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { withSentry } from "@/utils/api"

const postBodySchema = z.object({
  amount: z.number(),
  paymentMethod: z.enum(PaymentMethodsEnum),
  stripeAccount: z.string().nullable().optional(),
  campaignId: z.string(),
  campaignName: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  userId: z.string(),
  consumerId: z.string().optional(),
  consumerPaymentLogId: z.string().optional(),
  parentId: z.string().optional(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = postBodySchema.parse(await req.json())
  const {
    amount,
    stripeAccount,
    campaignId,
    campaignName,
    organizationId,
    organizationName,
    userId,
    paymentMethod,
    consumerId,
    consumerPaymentLogId,
    parentId,
  } = body

  if (!stripeAccount) {
    return NextResponse.json({ error: "Stripe account is required" }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: user } = (await serviceClient
    .from("users")
    .select(
      `*,
        organizations_users!organizations_users_user_id_users_id_fk!inner(*, organizations(*))`
    )
    .filter("id", "eq", userId)
    .single()) as {
    data: SupabaseUser & {
      organizations_users: SupabaseOrganizationUser[]
    }
  }

  let email = user.email ?? undefined

  const account = await stripe.accounts.retrieve(stripeAccount)
  const mcc = account.business_profile?.mcc as MCCEnum

  const applicationFeeAmount =
    parentId && paymentMethod === PaymentMethodsEnum.US_BANK_ACCOUNT
      ? 0
      : getPaymentApplicationFeeAmount({
          amountCents: amount,
          paymentMethod,
          mcc,
        })
  email = z.email().safeParse(email).success ? email : undefined

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amount + applicationFeeAmount,
      currency: "usd",
      metadata: {
        organizationId,
        organizationName,
        campaignName,
        campaignId,
        userId,
        userPin: user?.pin ?? null,
        ...(consumerId ? { consumerId } : {}),
        ...(consumerPaymentLogId ? { consumerPaymentLogId } : {}),
      },
      receipt_email: email ?? undefined,
      application_fee_amount: applicationFeeAmount,
      ...(parentId
        ? {
            automatic_payment_methods: {
              enabled: true,
            },
          }
        : {
            payment_method_types: ["card", "cashapp"],
          }),
    },
    { stripeAccount }
  )

  return NextResponse.json({ data: paymentIntent }, { status: 200 })
})

const putBodySchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number(),
  paymentMethod: z.enum(PaymentMethodsEnum),
  stripeAccount: z.string().nullable().optional(),
  parentId: z.string().optional(),
})

export const PUT = withSentry(async (req: NextRequest) => {
  const body = putBodySchema.parse(await req.json())
  const { paymentIntentId, amount, paymentMethod, stripeAccount, parentId } = body

  if (!stripeAccount) {
    return NextResponse.json({ error: "Stripe account is required" }, { status: 400 })
  }

  const account = await stripe.accounts.retrieve(stripeAccount)
  const mcc = account.business_profile?.mcc as MCCEnum

  const applicationFeeAmount =
    parentId && paymentMethod === PaymentMethodsEnum.US_BANK_ACCOUNT
      ? 0
      : getPaymentApplicationFeeAmount({
          amountCents: amount,
          paymentMethod,
          mcc,
        })

  const paymentIntent = await stripe.paymentIntents.update(
    paymentIntentId,
    {
      amount: amount + applicationFeeAmount,
      application_fee_amount: applicationFeeAmount,
    },
    { stripeAccount }
  )

  return NextResponse.json({ data: paymentIntent }, { status: 200 })
})
