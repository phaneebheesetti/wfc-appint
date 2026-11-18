import { render } from "@react-email/components"
import * as Sentry from "@sentry/nextjs"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ShopOrderParentNotificationEmail } from "@/components/emails/shop-order-parent-notification-email"
import { UsersStatusEnum } from "@/constants/users"
import { env } from "@/env"
import { createServiceClient } from "@/lib/supabase/service-client"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"
import { formatCentsToCurrency } from "@/utils/money"

const EMAIL_TYPE = "shop-order-parent-notification"

const bodySchema = z.object({
  salesPageId: z.string().uuid(),
  buyerName: z.string().optional(),
  phoneNumber: z.string(),
  buyerEmail: z.email(),
  preferredContactMethodLabel: z.string(),
  address: z.string().optional(),
  itemName: z.string(),
  barsQuantity: z.number().int().positive(),
  paymentStatusLabel: z.string(),
  amountCents: z.number().int().nonnegative(),
  specialRequest: z.string().optional(),
})

export const POST = withSentry(async (req: NextRequest) => {
  Sentry.getIsolationScope().setTag("email_type", EMAIL_TYPE)

  const body = bodySchema.parse(await req.json())
  const {
    salesPageId,
    buyerName,
    phoneNumber,
    buyerEmail,
    preferredContactMethodLabel,
    address,
    itemName,
    barsQuantity,
    paymentStatusLabel,
    amountCents,
    specialRequest,
  } = body

  Sentry.getIsolationScope().setContext("shopOrderParentNotification", { salesPageId })

  const serviceClient = createServiceClient()

  const { data: salesInfo, error: salesInfoError } = await serviceClient
    .from("digital_sales_information")
    .select("id, participant_id, fundraiser_id")
    .eq("id", salesPageId)
    .maybeSingle()

  if (salesInfoError) {
    return NextResponse.json({ error: "Failed to load sales page for parent notification." }, { status: 500 })
  }

  if (!salesInfo) {
    return NextResponse.json({ error: "Sales page not found." }, { status: 404 })
  }

  const { data: campaign, error: campaignError } = await serviceClient
    .from("campaigns")
    .select("name, organization_id")
    .eq("id", salesInfo.fundraiser_id)
    .maybeSingle()

  if (campaignError) {
    return NextResponse.json({ error: "Failed to load fundraiser for parent notification." }, { status: 500 })
  }

  if (!campaign) {
    return NextResponse.json({ error: "Fundraiser not found." }, { status: 404 })
  }

  const { data: participant, error: participantError } = await serviceClient
    .from("users")
    .select("parent_user_id, created_at, full_name")
    .eq("id", salesInfo.participant_id)
    .maybeSingle()

  if (participantError) {
    return NextResponse.json({ error: "Failed to load participant for parent notification." }, { status: 500 })
  }

  const participantFullName = (participant?.full_name as string | null)?.trim() ?? ""

  const { data: parentMappings, error: parentMappingsError } = await serviceClient
    .from("participant_parent_mapping")
    .select("parent_user_id, created_at")
    .eq("participant_user_id", salesInfo.participant_id)

  if (parentMappingsError) {
    return NextResponse.json({ error: "Failed to load parents for parent notification." }, { status: 500 })
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

  let parentEmail: string | undefined

  if (parentUserIds.length > 0) {
    const { data: parents, error: parentsError } = await serviceClient
      .from("users")
      .select("id, email")
      .in("id", parentUserIds)
      .eq("status", UsersStatusEnum.ACTIVE)
      .is("deleted_at", null)
      .not("email", "is", null)

    if (parentsError) {
      return NextResponse.json({ error: "Failed to load parent emails for parent notification." }, { status: 500 })
    }

    parentEmail = (parents ?? [])
      .map(parent => ({ id: parent.id as string, email: (parent.email as string | null)?.trim() }))
      .filter(parent => !!parent.email)
      .sort(
        (a, b) =>
          (parentLinkedAtMs.get(a.id) ?? Number.POSITIVE_INFINITY) -
          (parentLinkedAtMs.get(b.id) ?? Number.POSITIVE_INFINITY)
      )[0]?.email
  }

  // No active parent found — this is an expected so we skip
  if (!parentEmail) {
    return NextResponse.json({ data: { sent: false, reason: "no_active_parent" } }, { status: 200 })
  }

  const { data: organization, error: organizationError } = await serviceClient
    .from("organizations")
    .select("name")
    .eq("id", campaign.organization_id)
    .maybeSingle()

  if (organizationError) {
    return NextResponse.json({ error: "Failed to load organization for parent notification." }, { status: 500 })
  }

  const formattedAmount = formatCentsToCurrency(amountCents)
  const wfcentralUrl = env.NEXT_PUBLIC_APP_URL

  const html = await render(
    <ShopOrderParentNotificationEmail
      participantFullName={participantFullName}
      organizationName={organization?.name ?? ""}
      campaignName={campaign.name ?? ""}
      wfcentralUrl={wfcentralUrl}
      buyerName={buyerName ?? ""}
      phoneNumber={phoneNumber}
      buyerEmail={buyerEmail}
      preferredContactMethodLabel={preferredContactMethodLabel}
      address={address ?? ""}
      itemName={itemName}
      barsQuantity={barsQuantity}
      paymentStatusLabel={paymentStatusLabel}
      formattedAmount={formattedAmount}
      specialRequest={specialRequest ?? ""}
    />
  )

  let result
  try {
    result = await sendEmail({
      to: [parentEmail],
      subject: `New Online Order for ${participantFullName} - ${organization?.name ?? ""} - ${campaign.name ?? ""}`,
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
    { data: { sent: true, statusCode: statusCode ?? 0 }, message: "Email sent successfully" },
    { status }
  )
})
