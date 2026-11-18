import { auth, clerkClient } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { ROLE_SESSION_COOKIE_NAME, resolveActiveRole, signRoleSessionCookie } from "@/lib/role-session"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { roleSwitchHistoryCreate } from "@/server/services/role-switch-history/role-switch-history-create"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  role: z.enum(RolesEnum),
})

export const POST = withSentry(async (req: NextRequest) => {
  const session = await auth()
  const clerkId = session.userId
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { role } = bodySchema.parse(await req.json())

  const client = await clerkClient()
  const user = await client.users.getUser(clerkId)
  const meta = user.publicMetadata as UserPublicMetadata

  const target = meta.roles?.find(r => r.role === role)
  if (!target) {
    return NextResponse.json({ error: "User does not hold this role" }, { status: 403 })
  }

  const existingCookieValue = req.cookies.get(ROLE_SESSION_COOKIE_NAME)?.value
  const resolvedRole = await resolveActiveRole({
    cookieValue: existingCookieValue,
    clerkId: user.id,
    fallbackRole: session.sessionClaims?.user_role as RolesEnum | undefined,
    fallbackDatabaseId: session.sessionClaims?.user_id,
    secret: env.ROLE_SESSION_SECRET,
  })

  const previousRole = resolvedRole?.role ?? (session.sessionClaims?.user_role as RolesEnum)
  const cookieValue = await signRoleSessionCookie({
    clerkId,
    role: target.role,
    databaseId: target.databaseId,
    secret: env.ROLE_SESSION_SECRET,
  })

  const response = NextResponse.json(
    { data: { role: target.role, databaseId: target.databaseId }, message: "Active role set for this browser" },
    { status: 200 }
  )
  response.cookies.set(ROLE_SESSION_COOKIE_NAME, cookieValue, {
    // HMAC + clerkId binding is the security boundary; the client UI needs to
    // read the active role to render correctly, so this is intentionally not HttpOnly.
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  const dbUser = await db.query.users.findFirst({
    where: and(eq(users.clerkId, clerkId), eq(users.role, previousRole)),
    columns: {
      id: true,
      clerkId: true,
      role: true,
    },
  })

  if (!dbUser) {
    throw new Error("DB user not found for clerkId + role")
  }

  await roleSwitchHistoryCreate({
    database: db,
    input: {
      userId: dbUser.id,
      previousRole: previousRole,
      newRole: target.role,
      timestamp: new Date(),
    },
  })

  return response
})
