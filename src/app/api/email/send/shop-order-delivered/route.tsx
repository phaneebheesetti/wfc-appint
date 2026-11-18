import { render } from "@react-email/components"
import * as Sentry from "@sentry/nextjs"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ShopOrderDeliveredEmail } from "@/components/emails/shop-order-delivered-email"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

const EMAIL_TYPE = "shop-order-delivered"

const bodySchema = z.object({
  email: z.email(),
  message: z.string().min(1).max(2000),
})

export const POST = withSentry(async (req: NextRequest) => {
  Sentry.getIsolationScope().setTag("email_type", EMAIL_TYPE)

  const { email, message } = bodySchema.parse(await req.json())

  const html = await render(<ShopOrderDeliveredEmail message={message} />)

  let result

  try {
    result = await sendEmail({
      to: [email],
      subject: "Your order has been delivered!",
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
