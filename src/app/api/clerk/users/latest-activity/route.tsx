import { createClerkClient } from "@clerk/backend"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/env"
import { withSentry } from "@/utils/api"

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })

const CLERK_BATCH_SIZE = 100

const bodySchema = z.object({
  ids: z.array(z.string()),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { ids } = body

  if (ids.length === 0) {
    return NextResponse.json({ data: { lastActiveAt: null } }, { status: 200 })
  }

  let latestActiveAt: Date | null = null

  for (let i = 0; i < ids.length; i += CLERK_BATCH_SIZE) {
    const batchIds = ids.slice(i, i + CLERK_BATCH_SIZE)

    const response = await clerkClient.users.getUserList({
      userId: batchIds,
      limit: batchIds.length,
      orderBy: "-last_active_at",
    })

    const firstUser = response.data[0]
    if (firstUser?.lastActiveAt) {
      const userActiveAt = new Date(firstUser.lastActiveAt)
      if (!latestActiveAt || userActiveAt > latestActiveAt) {
        latestActiveAt = userActiveAt
      }
    }
  }

  return NextResponse.json({ data: { lastActiveAt: latestActiveAt } }, { status: 200 })
})
