import { NextResponse } from "next/server"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import { env } from "@/env"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service-client"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const serviceClient = createServiceClient()

  //get the digital sales page using the UUID from /shop/[id].
  const { data: salesInfo, error: salesInfoError } = await serviceClient
    .from("digital_sales_information")
    .select("id, participant_id, fundraiser_id, digital_sales_details")
    .eq("id", id)
    .maybeSingle()

  if (salesInfoError) {
    console.error("Failed to fetch digital sales information:", salesInfoError)

    return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
  }

  if (!salesInfo) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  //don't show a sales page that has been disabled
  const salesPageDetails = salesInfo.digital_sales_details?.enable_sales_page

  if (!salesPageDetails?.is_active) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  //participant info
  const { data: participant, error: participantError } = await serviceClient
    .from("users")
    .select("first_name, full_name, pin")
    .eq("id", salesInfo.participant_id)
    .maybeSingle()

  if (participantError) {
    console.error("Failed to fetch participant:", participantError)

    return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
  }

  if (!participant) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  //fundraiser info
  const { data: campaign, error: campaignError } = await serviceClient
    .from("campaigns")
    .select("name, deleted_at, status, digital_payment, organization_id")
    .eq("id", salesInfo.fundraiser_id)
    .maybeSingle()

  if (campaignError) {
    console.error("Failed to fetch campaign:", campaignError)

    return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
  }

  if (!campaign) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  // Check whether the campaign's organization has a connected Stripe account.
  let stripeAccountId: string | null = null

  if (campaign.organization_id) {
    const { data: organization, error: organizationError } = await serviceClient
      .from("organizations")
      .select("stripe_connected_account_id")
      .eq("id", campaign.organization_id)
      .maybeSingle()

    if (organizationError) {
      console.error("Failed to fetch organization's Stripe account:", organizationError)

      return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
    }

    stripeAccountId = organization?.stripe_connected_account_id ?? null
  }

  // Check whether the connected Stripe account can accept charges.
  // Only perform this Stripe API call when the feature flag is enabled.
  let stripeAccountActive = false

  if (stripeAccountId && env.STRIPE_RESTRICTION_CHECK === "true") {
    try {
      const account = await stripe.accounts.retrieve(stripeAccountId)
      stripeAccountActive = account.charges_enabled
    } catch (error) {
      console.error(`Failed to retrieve Stripe account ${stripeAccountId}`, error)
    }
  }

  const cardPaymentAvailable = !!stripeAccountId && (env.STRIPE_RESTRICTION_CHECK !== "true" || stripeAccountActive)

  //cases transactions for fundraiser
  const { data: deliveredCases, error: deliveredCasesError } = await serviceClient
    .from("cases_transactions")
    .select("quantity, bars_per_case")
    .eq("campaign_id", salesInfo.fundraiser_id)
    .eq("type", "delivered")

  if (deliveredCasesError) {
    return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
  }

  //digital sales information for all participants in the fundraiser
  const { data: fundraiserSalesPages, error: fundraiserSalesPagesError } = await serviceClient
    .from("digital_sales_information")
    .select("digital_sales_details")
    .eq("fundraiser_id", salesInfo.fundraiser_id)

  if (fundraiserSalesPagesError) {
    console.error("Failed to fetch fundraiser digital sales information:", fundraiserSalesPagesError)

    return NextResponse.json({ error: "Failed to fetch sales page." }, { status: 500 })
  }

  const soldBars = (fundraiserSalesPages ?? []).reduce((total, page) => {
    const inventory = page.digital_sales_details?.inventory_details

    return total + (inventory?.sold_online ?? 0) + (inventory?.sold_in_person ?? 0)
  }, 0)

  const currentInventory = salesInfo.digital_sales_details?.inventory_details

  const availableBars =
    (currentInventory?.total_bars ?? 0) - (currentInventory?.sold_online ?? 0) - (currentInventory?.sold_in_person ?? 0)

  //goal = sum of delivered cases × bars per case.
  const goalBars = (deliveredCases ?? []).reduce(
    (total, transaction) => total + transaction.quantity * (transaction.bars_per_case ?? 0),
    0
  )

  const message = salesInfo.digital_sales_details?.personal_message?.message ?? "-"

  return NextResponse.json({
    data: {
      firstName: participant.first_name ?? "",
      fullName: participant.full_name ?? "",
      pin: participant.pin,
      message,
      campaignName: campaign.name ?? "",
      campaignDeleted: !!campaign.deleted_at,
      campaignEnded: campaign.status === CampaignsStatusEnum.ENDED,
      digitalPaymentEnabled: campaign.digital_payment,
      cardPaymentAvailable,
      goalBars,
      soldBars,
      availableBars,
    },
  })
}
