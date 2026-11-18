import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/env"
import { stripe } from "@/lib/stripe"
import {
  type SupabaseCampaignUser,
  type SupabaseOrganizationUser,
  type SupabaseUser,
  createServiceClient,
} from "@/lib/supabase/service-client"
import { type User } from "@/server/db/schema"
import { withSentry } from "@/utils/api"
import { getUserDisplayName } from "@/utils/users"

const bodySchema = z.object({
  pin: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { pin } = body

  if (!pin) {
    return NextResponse.json({ error: "PIN is required" }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  const { data: user } = (await serviceClient
    .from("users")
    .select(
      `*,
        campaigns_users!inner(*, campaigns(*)),
        organizations_users!organizations_users_user_id_users_id_fk!inner(*, organizations(*))`
    )
    .filter("pin", "ilike", pin)
    .single()) as {
    data: SupabaseUser & {
      campaigns_users: SupabaseCampaignUser[]
      organizations_users: SupabaseOrganizationUser[]
    }
  }

  if (!user || !user.organizations_users.length || !user.campaigns_users.length) {
    return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 400 })
  }

  const participantName = getUserDisplayName({
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    fullName: user.full_name ?? "",
  } as unknown as User)

  const eligibleOrganizationIds = user.organizations_users
    .filter(orgUser => orgUser.eligible)
    .map(orgUser => orgUser.organization_id)

  const eligibleCampaigns = user.campaigns_users
    .filter(
      campaignUser =>
        eligibleOrganizationIds.includes(campaignUser?.campaigns?.organization_id ?? "") &&
        campaignUser.campaigns?.digital_payment
    )
    .map(campaignUser => campaignUser.campaigns)

  if (eligibleCampaigns.length === 0) {
    return NextResponse.json(
      { error: "No fundraisers with digital payments enabled were found for this participant." },
      { status: 400 }
    )
  }

  const campaignOptions = eligibleCampaigns
    .map(campaign => {
      const organization = user.organizations_users.find(
        orgUser => orgUser.organization_id === campaign?.organization_id
      )?.organizations

      return {
        campaignId: campaign?.id,
        campaignName: campaign?.name,
        organizationId: campaign?.organization_id,
        organizationName: organization?.name,
        stripeAccount: organization?.stripe_connected_account_id,
      }
    })
    .filter(campaignOption => campaignOption.stripeAccount)

  if (campaignOptions.length === 0) {
    return NextResponse.json({ error: "No Stripe account is linked to this fundraiser." }, { status: 400 })
  }

  if (env.STRIPE_RESTRICTION_CHECK === "true") {
    const activeCampaignOptions = []

    for (const campaign of campaignOptions) {
      try {
        const account = await stripe.accounts.retrieve(campaign.stripeAccount!)

        if (account.charges_enabled) {
          activeCampaignOptions.push(campaign)
        }
      } catch (error) {
        console.error(`Failed to retrieve Stripe account ${campaign.stripeAccount}`, error)
      }
    }

    if (activeCampaignOptions.length === 0) {
      return NextResponse.json({ error: "No active Stripe account is linked to this fundraiser." }, { status: 400 })
    }
  }

  return NextResponse.json(
    {
      data: {
        isValid: true,
        userId: user.id,
        participantName,
        campaigns: campaignOptions,
      },
    },
    { status: 200 }
  )
})
