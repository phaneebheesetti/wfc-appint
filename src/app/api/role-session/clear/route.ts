import { type NextRequest, NextResponse } from "next/server"

import { ROLE_SESSION_COOKIE_NAME } from "@/lib/role-session"
import { withSentry } from "@/utils/api"

const handler = withSentry(async (_req: NextRequest) => {
  const response = NextResponse.json({ message: "Active role cleared for this browser" }, { status: 200 })
  response.cookies.delete(ROLE_SESSION_COOKIE_NAME)
  return response
})

export { handler as POST, handler as DELETE }
