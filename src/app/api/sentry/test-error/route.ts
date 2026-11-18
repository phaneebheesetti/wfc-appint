import { type NextRequest } from "next/server"

import { withSentry } from "@/utils/api"

export const GET = withSentry(async (_req: NextRequest) => {
  throw new Error("Sentry test (server): GET /api/sentry/test-error")
})
