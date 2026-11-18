import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { GuardianPermissionSlipSignatureEmail } from "@/components/emails/guardian-permission-slip-signature-email"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  emailAddresses: z.array(z.string()),
  fromName: z.string(),
  organizationName: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { emailAddresses, fromName, organizationName } = body

  const html = await render(<GuardianPermissionSlipSignatureEmail organizationName={organizationName} />)

  // Send individual emails to each recipient to ensure all are delivered
  const subject = `Permission Needed for Upcoming ${organizationName} Fundraiser`

  const results = await Promise.all(
    emailAddresses.map(emailAddress => sendEmail({ to: [emailAddress], fromName, subject, html }))
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
