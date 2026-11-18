import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { WelcomeEmail } from "@/components/emails/welcome-email"
import { APP_NAME } from "@/constants/app"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  emails: z.array(z.email()),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { emails } = body

  const html = await render(<WelcomeEmail />)

  const result = await sendEmail({
    to: emails,
    subject: `You're In! Welcome to ${APP_NAME}!`,
    html,
  })

  const statusCode = result[0]?.statusCode
  const status = statusCode && statusCode >= 200 && statusCode < 300 ? statusCode : 200

  return NextResponse.json(
    {
      data: { statusCode: statusCode ?? 0 },
      message: "Emails sent successfully",
    },
    { status }
  )
})
