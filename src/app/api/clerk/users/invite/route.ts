import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { phoneType } from "@/lib/zod/types"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  email: z.email(),
  role: z.enum(RolesEnum),
  databaseId: z.string(),

  phone: phoneType.optional().nullable(),
  notify: z.boolean().optional().default(true),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { email, role, databaseId, phone, notify = true } = body

  const client = await clerkClient()

  const redirectParams = new URLSearchParams({ role, databaseId })
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${env.APP_URL}/accept-invitation?${redirectParams.toString()}`,
    publicMetadata: {
      role,
      roles: [{ databaseId, role }],
      databaseId,
      phone: phone ?? undefined,
    },
    ignoreExisting: true,
    notify,
  })

  return NextResponse.json({ data: { url: invitation.url, email: invitation.emailAddress } }, { status: 200 })
})
