import { createClerkClient } from "@clerk/backend"
import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import EmailChangeNotificationEmail from "@/components/emails/email-change-verification-email"
import { env } from "@/env"
import { createServiceClient } from "@/lib/supabase/service-client"
import { sendEmail } from "@/server/services/email-messaging"
import { clerkIdentityMatchesSupabase } from "@/server/services/users/users-clerk-identity-match"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  currentEmail: z.email(),
  newEmail: z.email(),
  clerkId: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { currentEmail, clerkId } = body

  const supabase = createServiceClient()

  const emailUpdateLink = await generateEmailUpdateLink(clerkId)
  const reportLink = await generateReportEmailLink(clerkId)

  //save url and timestamp
  await supabase
    .from("users")
    .update({
      confirm_email_url: emailUpdateLink,
      report_email_url: reportLink,
      email_verification_sent_at: new Date().toISOString(),
    })
    .or(clerkIdentityMatchesSupabase(clerkId))

  const html = await render(<EmailChangeNotificationEmail token={emailUpdateLink} reportToken={reportLink} />)

  const result = await sendEmail({
    to: [currentEmail],
    subject: `Email Address Update`,
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

export async function generateEmailUpdateLink(clerkUserId: string) {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const signInToken = await clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60 * 60 * 24, // 24 hrs
  })
  return `${env.NEXT_PUBLIC_APP_URL}/email-update-confirmation?clerkId=${clerkUserId}&ticket=${signInToken.token}`
}

export async function generateReportEmailLink(clerkUserId: string) {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const signInToken = await clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60 * 60 * 24,
  })

  return `${env.NEXT_PUBLIC_APP_URL}/email-update-report?clerkId=${clerkUserId}&ticket=${signInToken.token}`
}
