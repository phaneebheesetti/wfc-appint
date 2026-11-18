import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RequestChocolateEmail } from "@/components/emails/request-chocolate-email"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  to: z.string(),
  fundraisingManagerName: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { to, fundraisingManagerName } = body

  const html = await render(<RequestChocolateEmail fundraisingManagerName={fundraisingManagerName} />)

  const result = await sendEmail({
    to: [to],
    subject: "Request for more chocolate",
    html,
  })

  const statusCode = result[0]?.statusCode
  const status = statusCode && statusCode >= 200 && statusCode < 300 ? statusCode : 200

  return NextResponse.json(
    {
      data: { statusCode: statusCode ?? 0 },
      message: "Email sent successfully",
    },
    { status }
  )
})
