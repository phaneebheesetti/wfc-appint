import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { phoneType } from "@/lib/zod/types"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  email: z.email().optional().nullable(),
  phone: phoneType.optional().nullable(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { email, phone } = body

  const hasEmail = email && email !== ""
  const hasPhone = phone && phone !== ""
  if (!hasEmail && !hasPhone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 })
  }

  const client = await clerkClient()

  const queryParams: {
    emailAddress?: string[]
    phoneNumber?: string[]
  } = {}

  if (hasEmail) {
    queryParams.emailAddress = [email]
  }

  if (hasPhone) {
    queryParams.phoneNumber = [phone]
  }

  const users = await client.users.getUserList(queryParams)

  return NextResponse.json({ data: users.data, message: "Users found successfully" }, { status: 200 })
})
