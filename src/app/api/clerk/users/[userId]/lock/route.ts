import { clerkClient } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

import { resolveClerkUserByAnyIdentifier } from "@/server/services/users/users-resolve-clerk-user"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const userId = params.userId as string

  const client = await clerkClient()
  // The route's `userId` param may be a `clerk_id` OR a `clerk_external_id`
  // depending on which column the calling DB row populated. Resolve before
  // calling lockUser, which only accepts a Clerk-issued id.
  const resolved = await resolveClerkUserByAnyIdentifier(client, userId)
  if (!resolved) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const user = await client.users.lockUser(resolved.id)

  return NextResponse.json({ data: user }, { status: 200 })
})
