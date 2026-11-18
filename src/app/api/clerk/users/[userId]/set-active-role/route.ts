import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { resolveClerkUserByAnyIdentifier } from "@/server/services/users/users-resolve-clerk-user"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  role: z.enum(RolesEnum),
  databaseId: z.string(),
})

export const POST = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const userId = params.userId as string

  const { role, databaseId } = bodySchema.parse(await req.json())

  const client = await clerkClient()
  // `userId` param may be a `clerk_id` OR a `clerk_external_id` — see
  // [resolveClerkUserByAnyIdentifier].
  const clerkUser = await resolveClerkUserByAnyIdentifier(client, userId)
  if (!clerkUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await client.users.updateUserMetadata(clerkUser.id, {
    publicMetadata: { ...clerkUser.publicMetadata, role, databaseId },
  })

  return NextResponse.json({ data: { role, databaseId } }, { status: 200 })
})
