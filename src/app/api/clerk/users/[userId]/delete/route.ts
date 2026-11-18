import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

import { resolveClerkUserByAnyIdentifier } from "@/server/services/users/users-resolve-clerk-user"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const userId = params.userId as string

  const client = await clerkClient()
  // `userId` param may be a `clerk_id` OR a `clerk_external_id` — see
  // [resolveClerkUserByAnyIdentifier]. Resolve before calling deleteUser.
  const resolved = await resolveClerkUserByAnyIdentifier(client, userId)
  if (!resolved) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const user = await client.users.deleteUser(resolved.id)

  return NextResponse.json({ data: user }, { status: 200 })
})
