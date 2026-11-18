import { auth } from "@clerk/nextjs/server"
import { type FetchCreateContextFnOptions, fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { type NextRequest } from "next/server"

import { type RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { ROLE_SESSION_COOKIE_NAME, resolveActiveRole } from "@/lib/role-session"
import { createTRPCContext } from "@/server/api/core"
import { appRouter } from "@/server/api/root"

const CORS_ALLOWED_HEADERS = "Content-Type, Authorization"
const CORS_ALLOWED_METHODS = "GET, POST, OPTIONS"

function getAllowedOrigins(): string[] {
  const origins = [env.APP_URL]
  if (env.NODE_ENV === "development") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000")
  }
  return origins
}

function getCorsAllowedOrigin(origin: string | null, allowedOrigins: string[]): string | null {
  if (!origin) return null
  return allowedOrigins.includes(origin) ? origin : null
}

function parseCookie(header: string, name: string): string | undefined {
  if (!header) return undefined
  for (const pair of header.split(";")) {
    const [k, v] = pair.trim().split("=")
    if (k === name) return v ? decodeURIComponent(v) : undefined
  }
  return undefined
}

function applyCorsHeaders(headers: Headers, allowedOrigin: string | null): void {
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin)
    headers.set("Access-Control-Allow-Credentials", "true")
    headers.set("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS)
    headers.set("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS)
  }
}

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 * CORS headers are set on resHeaders so only allowed origins can call the API from the browser.
 */
const createContext = async (opts: FetchCreateContextFnOptions) => {
  const allowedOrigins = getAllowedOrigins()
  const origin = opts.req.headers.get("Origin")
  const allowedOrigin = getCorsAllowedOrigin(origin, allowedOrigins)
  applyCorsHeaders(opts.resHeaders, allowedOrigin)

  const clerkSession = await auth()

  const cookieValue = parseCookie(opts.req.headers.get("cookie") ?? "", ROLE_SESSION_COOKIE_NAME)
  const { role } = await resolveActiveRole({
    cookieValue,
    clerkId: clerkSession.userId,
    fallbackRole: clerkSession.sessionClaims?.user_role as RolesEnum | undefined,
    fallbackDatabaseId: clerkSession.sessionClaims?.user_id,
    secret: env.ROLE_SESSION_SECRET,
  })

  const baseContext = await createTRPCContext({
    headers: opts.req.headers,
    userId: clerkSession.sessionClaims?.user_id,
    userRole: role,
  })

  return { ...baseContext, resHeaders: opts.resHeaders }
}

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: opts => createContext(opts),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`)
          }
        : undefined,
  })

function optionsHandler(req: NextRequest): Response {
  const allowedOrigins = getAllowedOrigins()
  const origin = req.headers.get("Origin")
  const allowedOrigin = getCorsAllowedOrigin(origin, allowedOrigins)

  const headers = new Headers()
  applyCorsHeaders(headers, allowedOrigin)

  return new Response(null, { status: 204, headers })
}

export { handler as GET, handler as POST, optionsHandler as OPTIONS }
