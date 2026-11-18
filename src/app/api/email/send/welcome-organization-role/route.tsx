import { createClerkClient } from "@clerk/backend"
import { render } from "@react-email/components"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { WelcomeOrganizationRoleEmail } from "@/components/emails/welcome-organization-role-email"
import { APP_NAME } from "@/constants/app"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { sendEmail } from "@/server/services/email-messaging"
import { withSentry } from "@/utils/api"

// Sends a magic-signin email for org-scoped roles (ORG_ADMIN, ORG_STAFF) when
// a Clerk user already exists for the email but the human hasn't completed
// onboarding yet. Mirrors the welcome-parent magic-signin pattern — used by
// the clone path in `usersCloneForRole` when donor.clerkId is set but donor
// is not ACTIVE, since Clerk's createInvitation flow is a dead end in that
// state (signUp.create({strategy:"ticket"}) fails with invitation_account_exists).
const bodySchema = z.object({
  email: z.email(),
  clerkId: z.string(),
  role: z.enum(RolesEnum),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { email, clerkId, role } = body

  const signInLink = await generateClerkSignInLink({ clerkUserId: clerkId, role })

  const html = await render(<WelcomeOrganizationRoleEmail signInLink={signInLink} />)

  const result = await sendEmail({
    to: [email],
    subject: `You've been added to ${APP_NAME}`,
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

async function generateClerkSignInLink({ clerkUserId, role }: { clerkUserId: string; role: RolesEnum }) {
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  const signInToken = await clerkClient.signInTokens.createSignInToken({
    userId: clerkUserId,
    expiresInSeconds: 60 * 60 * 24 * 30, // 30 days
  })

  return `${env.NEXT_PUBLIC_APP_URL}/magic-signin?clerkId=${clerkUserId}&ticket=${signInToken.token}&role=${role}`
}
