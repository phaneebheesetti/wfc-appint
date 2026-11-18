import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { phoneType } from "@/lib/zod/types"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  databaseId: z.string(),
  role: z.enum(RolesEnum),

  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.email().optional().nullable(),
  phone: phoneType.optional().nullable(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { databaseId, role, firstName, lastName, email, phone } = body

  if (!email && !phone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 })
  }

  const client = await clerkClient()

  const user = await client.users.createUser({
    emailAddress: email ? [email] : undefined,
    phoneNumber: phone ? [phone] : undefined,
    publicMetadata: {
      role,
      roles: [{ databaseId, role }],
      databaseId,
    },
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
  })

  return NextResponse.json({ data: user, message: "User created successfully" }, { status: 200 })
})
