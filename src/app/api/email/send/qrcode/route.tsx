import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { QRCodeEmail } from "@/components/emails/qrcode-email"
import { createServiceClient } from "@/lib/supabase/service-client"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"
import { generateCampaignQrCodesPDF } from "@/utils/campaigns"

const bodySchema = z.object({
  campaignId: z.string(),
  email: z.string(),
  fromName: z.string(),
})

type CampaignParticipantQueryResult = {
  id: string
  campaign_id: string
  user_id: string
  created_at: string
  updated_at: string
  users: {
    first_name: string
    last_name: string
    email: string
    pin: string
    teacher_name: string
    grade: string
  }
}

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { campaignId, email, fromName } = body

  const serviceClient = createServiceClient()

  const { data: participants } = (await serviceClient
    .from("campaigns_users")
    .select(
      `
        *,
        users!inner(
          first_name,
          last_name,
          email,
          pin,
          teacher_name,
          grade
        )
      `
    )
    .eq("campaign_id", campaignId)) as {
    data: CampaignParticipantQueryResult[]
  }

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "No participants found" }, { status: 404 })
  }

  const pdfBuffer = await generateCampaignQrCodesPDF(
    participants.map(participant => ({
      email: participant.users?.email,
      first_name: participant.users?.first_name,
      last_name: participant.users?.last_name,
      pin: participant.users?.pin,
      teacher_name: participant.users?.teacher_name,
      grade: participant.users?.grade,
    }))
  )

  const html = await render(<QRCodeEmail />)

  const result = await sendEmail({
    to: [email],
    fromName,
    subject: "QR codes for your fundraiser",
    html,
    attachments: [
      {
        content: pdfBuffer?.toString("base64") || "",
        filename: `attachment.pdf`,
        type: "application/pdf",
        disposition: "attachment",
        contentId: "qr-code",
      },
    ],
  })

  const statusCode = result[0]?.statusCode
  const status = statusCode && statusCode >= 200 && statusCode < 300 ? statusCode : 200

  return NextResponse.json(
    {
      data: { statusCode: statusCode ?? 0 },
      message: "Emails sent successfully with QR codes",
    },
    { status }
  )
})
