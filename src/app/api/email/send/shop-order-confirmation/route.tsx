import { render } from "@react-email/components"
import * as Sentry from "@sentry/nextjs"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ShopOrderConfirmationEmail } from "@/components/emails/shop-order-confirmation-email"
import { BARS_PER_CASE, getPackageOptions } from "@/constants/inventory"
import { RolesEnum } from "@/constants/roles"
import { SHOP_ORDERS_PAYMENT_TYPE_DETAILS, ShopOrdersPaymentTypeEnum } from "@/constants/shop-orders"
import { UsersStatusEnum } from "@/constants/users"
import { createServiceClient } from "@/lib/supabase/service-client"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"
import { formatCentsToCurrency } from "@/utils/money"

const EMAIL_TYPE = "shop-order-confirmation"

const bodySchema = z.object({
  salesPageId: z.string().uuid(),
  packageKey: z.string(),
  paymentType: z.enum(ShopOrdersPaymentTypeEnum),
  email: z.email(),
  buyerName: z.string().trim().max(500).optional(),
  address: z.string().trim().max(500).optional(),
  varietyPreferences: z.string().max(500).optional(),
})

export const POST = withSentry(async (req: NextRequest) => {
  Sentry.getIsolationScope().setTag("email_type", EMAIL_TYPE)

  const body = bodySchema.parse(await req.json())
  const { salesPageId, packageKey, paymentType, email, buyerName, address, varietyPreferences } = body

  Sentry.getIsolationScope().setContext("shopOrderConfirmation", { salesPageId, packageKey, paymentType })

  const serviceClient = createServiceClient()

  const { data: salesInfo, error: salesInfoError } = await serviceClient
    .from("digital_sales_information")
    .select("id, participant_id, fundraiser_id")
    .eq("id", salesPageId)
    .maybeSingle()

  if (salesInfoError) {
    return NextResponse.json({ error: "Failed to load sales page for order confirmation." }, { status: 500 })
  }

  if (!salesInfo) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  const { data: campaign, error: campaignError } = await serviceClient
    .from("campaigns")
    .select("name, organization_id, sponsor_id")
    .eq("id", salesInfo.fundraiser_id)
    .maybeSingle()

  if (campaignError) {
    return NextResponse.json({ error: "Failed to load fundraiser for order confirmation." }, { status: 500 })
  }

  if (!campaign) {
    return NextResponse.json({ error: "Fundraiser not found." }, { status: 404 })
  }

  const { data: participant, error: participantError } = await serviceClient
    .from("users")
    .select("parent_user_id, created_at, first_name, full_name")
    .eq("id", salesInfo.participant_id)
    .maybeSingle()

  if (participantError) {
    return NextResponse.json({ error: "Failed to load participant for order confirmation." }, { status: 500 })
  }

  const participantName =
    [participant?.first_name as string | null, participant?.full_name as string | null]
      .map(name => name?.trim())
      .find(name => !!name) ?? ""

  const { data: parentMappings, error: parentMappingsError } = await serviceClient
    .from("participant_parent_mapping")
    .select("parent_user_id, created_at")
    .eq("participant_user_id", salesInfo.participant_id)

  if (parentMappingsError) {
    return NextResponse.json({ error: "Failed to load parents for order confirmation." }, { status: 500 })
  }

  const toLinkedAtMs = (linkedAt: string | null | undefined) => {
    const linkedAtMs = linkedAt ? new Date(linkedAt).getTime() : Number.NaN

    return Number.isNaN(linkedAtMs) ? Number.POSITIVE_INFINITY : linkedAtMs
  }

  const parentLinks = [
    ...(participant?.parent_user_id
      ? [
          {
            parentUserId: participant.parent_user_id as string,
            linkedAtMs: toLinkedAtMs(participant.created_at as string | null),
          },
        ]
      : []),
    ...(parentMappings ?? []).map(mapping => ({
      parentUserId: mapping.parent_user_id as string,
      linkedAtMs: toLinkedAtMs(mapping.created_at as string | null),
    })),
  ]

  const parentLinkedAtMs = new Map(parentLinks.map(link => [link.parentUserId, link.linkedAtMs]))

  const parentUserIds = parentLinks.map(link => link.parentUserId)

  let supportEmail: string | undefined

  if (parentUserIds.length > 0) {
    const { data: parents, error: parentsError } = await serviceClient
      .from("users")
      .select("id, email")
      .in("id", parentUserIds)
      .eq("status", UsersStatusEnum.ACTIVE)
      .is("deleted_at", null)
      .not("email", "is", null)

    if (parentsError) {
      return NextResponse.json({ error: "Failed to load parent emails for order confirmation." }, { status: 500 })
    }

    supportEmail = (parents ?? [])
      .map(parent => ({ id: parent.id as string, email: (parent.email as string | null)?.trim() }))
      .filter(parent => !!parent.email)
      .sort(
        (a, b) =>
          (parentLinkedAtMs.get(a.id) ?? Number.POSITIVE_INFINITY) -
          (parentLinkedAtMs.get(b.id) ?? Number.POSITIVE_INFINITY)
      )[0]?.email
  }

  if (!supportEmail) {
    const { data: sponsor, error: sponsorError } = await serviceClient
      .from("users")
      .select("email")
      .eq("id", campaign.sponsor_id)
      .eq("status", UsersStatusEnum.ACTIVE)
      .is("deleted_at", null)
      .not("email", "is", null)
      .maybeSingle()

    if (sponsorError) {
      return NextResponse.json({ error: "Failed to load sponsor for order confirmation." }, { status: 500 })
    }

    const sponsorEmail = (sponsor?.email as string | null)?.trim()

    if (sponsorEmail) {
      supportEmail = sponsorEmail
    }
  }

  if (!supportEmail) {
    const { data: orgAdmins, error: orgAdminsError } = await serviceClient
      .from("organizations_users")
      .select("created_at, users!organizations_users_user_id_users_id_fk!inner(email)")
      .eq("organization_id", campaign.organization_id)
      .eq("users.role", RolesEnum.ORGANIZATION_ADMIN)
      .eq("users.status", UsersStatusEnum.ACTIVE)
      .is("users.deleted_at", null)
      .not("users.email", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)

    if (orgAdminsError) {
      return NextResponse.json({ error: "Failed to load organization admin for order confirmation." }, { status: 500 })
    }

    const orgAdminUser = orgAdmins?.[0]?.users as { email?: string | null } | { email?: string | null }[] | undefined
    const orgAdminEmail = (Array.isArray(orgAdminUser) ? orgAdminUser[0]?.email : orgAdminUser?.email)?.trim()

    if (orgAdminEmail) {
      supportEmail = orgAdminEmail
    }
  }

  if (!supportEmail) {
    Sentry.captureMessage(
      "Shop order confirmation has no contact email: no active parent, campaign sponsor or organization admin",
      {
        level: "warning",
        tags: {
          email_type: EMAIL_TYPE,
          email_outcome: "missing_contact_email",
        },
      }
    )
  }

  const { data: organization, error: organizationError } = await serviceClient
    .from("organizations")
    .select("name")
    .eq("id", campaign.organization_id)
    .maybeSingle()

  if (organizationError) {
    return NextResponse.json({ error: "Failed to load organization for order confirmation." }, { status: 500 })
  }

  const barsPerCase = BARS_PER_CASE
  const pricePerBarCents = 200

  const selectedPackage = getPackageOptions(barsPerCase).find(option => option.key === packageKey)

  if (!selectedPackage) {
    return NextResponse.json({ error: "Unknown package selection." }, { status: 400 })
  }

  const totalCents = selectedPackage.bars * pricePerBarCents
  const formattedTotal = formatCentsToCurrency(totalCents)

  const { totalLabel, fulfillmentMethod, fulfillmentNote } = SHOP_ORDERS_PAYMENT_TYPE_DETAILS[paymentType]

  const html = await render(
    <ShopOrderConfirmationEmail
      buyerName={buyerName}
      participantName={participantName}
      itemName={selectedPackage.label}
      quantityLabel={`${selectedPackage.bars} ${selectedPackage.bars === 1 ? "bar" : "bars"}`}
      formattedPrice={formattedTotal}
      totalLabel={totalLabel}
      formattedTotal={formattedTotal}
      fulfillmentMethod={fulfillmentMethod}
      fulfillmentNote={fulfillmentNote}
      address={address}
      specialRequest={varietyPreferences}
      campaignName={campaign.name ?? ""}
      organizationName={organization?.name ?? ""}
      supportEmail={supportEmail}
    />
  )

  let result

  try {
    result = await sendEmail({
      to: [email],
      subject: "Your order is confirmed!",
      html,
      emailType: EMAIL_TYPE,
    })
  } catch (error) {
    Sentry.getIsolationScope().setTag("email_outcome", "send_failed")

    throw error
  }

  const statusCode = result[0]?.statusCode
  const status = statusCode && statusCode >= 200 && statusCode < 300 ? statusCode : 200

  return NextResponse.json(
    {
      data: { sent: true, statusCode: statusCode ?? 0 },
      message: "Email sent successfully",
    },
    { status }
  )
})
