import * as Sentry from "@sentry/nextjs"
import { type NextRequest, NextResponse } from "next/server"

type RouteContext = { params?: Promise<Record<string, string>> }

type RouteHandler = (req: NextRequest, context?: RouteContext) => Promise<NextResponse>

export function withSentry(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      return await handler(req, context)
    } catch (error) {
      Sentry.captureException(error)

      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  }
}
