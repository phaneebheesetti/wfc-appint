import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { AnnouncementEmail } from "@/components/emails/announcement-email"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  emailAddresses: z.array(z.string()),
  message: z.string(),
  title: z.string(),
  fromName: z.string(),
  organizationName: z.string(),
  organizationAdminEmail: z.string().optional().nullable(),
  campaignName: z.string(),
  includeLink: z.boolean().optional(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const {
    emailAddresses,
    message,
    title,
    fromName,
    organizationName,
    organizationAdminEmail,
    campaignName,
    includeLink,
  } = body

  const html = await render(
    <AnnouncementEmail
      content={message}
      title={title}
      organizationName={organizationName}
      campaignName={campaignName}
      includeLinkToApp={includeLink}
    />
  )

  // Send individual emails to each recipient to ensure all are delivered
  const subject = `Fundraising Update from ${organizationName}`

  const results = await Promise.all(
    emailAddresses.map(emailAddress => {
      // Organization admin user is added in CC
      // Check if parent email and organization admin user email are same
      const isAdminRecipient = organizationAdminEmail?.toLowerCase() === emailAddress.toLowerCase()
      // If parent and organization admin user email are same, then no need to add Org Admin User email in CC
      // If parent and organization admin user email are not same, then add Org Admin User email in CC
      const cc = organizationAdminEmail && !isAdminRecipient ? [organizationAdminEmail] : []
      return sendEmail({ to: [emailAddress], cc, fromName, subject, html })
    })
  )

  const statusCode = results[0]?.[0]?.statusCode
  const status = statusCode && statusCode >= 200 && statusCode < 300 ? statusCode : 200

  return NextResponse.json(
    {
      data: { statusCode: statusCode ?? 0 },
      message: "Email sent successfully",
    },
    { status }
  )
})
