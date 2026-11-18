import { createClerkClient } from "@clerk/backend"
import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { WelcomeParentEmail } from "@/components/emails/welcome-parent-email"
import { WFC_LONG_NAME } from "@/constants/app"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

// Accepts either:
//   - clerkId → returning parent w/ an existing Clerk user; generates a sign-in token link
//   - invitationUrl → fresh PARENT invite (no Clerk user yet); links the recipient
//     straight to the Clerk invitation URL so they can complete setup.
const bodySchema = z
  .object({
    email: z.email(),
    clerkId: z.string().optional(),
    invitationUrl: z.url().optional(),
  })
  .refine(b => !!b.clerkId || !!b.invitationUrl, {
    message: "Either clerkId or invitationUrl is required",
  })

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { email, clerkId, invitationUrl } = body

  const signInLink = clerkId ? await generateClerkSignInLink(clerkId) : invitationUrl!

  const html = await render(<WelcomeParentEmail signInLink={signInLink} />)

  const result = await sendEmail({
    to: [email],
    subject: `Your ${WFC_LONG_NAME} fundraiser is starting soon`,
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

async function generateClerkSignInLink(clerkUserId: string) {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const signInToken = await clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60 * 60 * 24 * 30, // 30 days
  })

  return `${env.NEXT_PUBLIC_APP_URL}/magic-signin?clerkId=${clerkUserId}&ticket=${signInToken.token}&role=${RolesEnum.PARENT}`
}
