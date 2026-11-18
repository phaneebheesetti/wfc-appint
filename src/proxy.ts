import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { NAVIGATION_ITEMS_BY_ROUTE, NavigationRoutesEnum } from "./constants/navigation"
import { type RolesEnum } from "./constants/roles"
import { env } from "./env"
import { ROLE_SESSION_COOKIE_NAME, signRoleSessionCookie, verifyRoleSessionCookie } from "./lib/role-session"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])

const sortedRouteEnums = Object.values(NavigationRoutesEnum).sort((a, b) => b.length - a.length)

function findRouteEnum(route: string): NavigationRoutesEnum | undefined {
  return sortedRouteEnums.find(routeEnum => route.startsWith(routeEnum))
}

const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}

export default clerkMiddleware(async (auth, req) => {
  // All non-dashboard routes are public
  if (!isProtectedRoute(req)) {
    return NextResponse.next()
  }

  const { userId, ...rest } = await auth()

  // If no user, redirect to home
  if (!userId) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const cookieValue = req.cookies.get(ROLE_SESSION_COOKIE_NAME)?.value
  const verifiedCookie = cookieValue
    ? await verifyRoleSessionCookie({
        cookieValue,
        expectedClerkId: userId,
        secret: env.ROLE_SESSION_SECRET,
      })
    : null

  const fallbackRole = rest.sessionClaims?.user_role as RolesEnum | undefined
  // user_roles is the live set projected from publicMetadata.roles via the
  // Clerk JWT session template. Undefined ⇒ legacy single-role user (do not
  // treat as "zero roles"); empty array ⇒ all roles revoked.
  const liveRoles = rest.sessionClaims?.user_roles

  // All roles revoked — sign the user out regardless of whether a per-browser
  // active-role cookie has ever been written. Most users never click "switch
  // role" so they have no cookie; keeping this check inside the cookie branch
  // left cookie-less users stuck on a stale role until JWT expiry.
  if (liveRoles && liveRoles.length === 0) {
    const target = new URL("/signout", req.url)
    target.searchParams.set("reason", "roles_revoked")
    const response = NextResponse.redirect(target)
    response.cookies.delete(ROLE_SESSION_COOKIE_NAME)
    return response
  }

  // Cookie wins when present and valid; otherwise the JWT-projected default.
  const baseRole: RolesEnum | null = verifiedCookie?.role ?? fallbackRole ?? null

  let role: RolesEnum | null = null
  let rebindFrom: RolesEnum | null = null
  let nextCookieValue: string | null = null

  if (baseRole && liveRoles && !liveRoles.some(r => r.role === baseRole)) {
    // The chosen role was revoked in another session — switch to the next
    // available rather than rejecting the request. Canonical ordering
    // (createdAt asc) is set in usersSyncClerkRoles. Mint a fresh cookie so
    // subsequent requests are stable even if the JWT default lags behind.
    const next = liveRoles[0]!
    rebindFrom = baseRole
    role = next.role
    nextCookieValue = await signRoleSessionCookie({
      clerkId: userId,
      role: next.role,
      databaseId: next.databaseId,
      secret: env.ROLE_SESSION_SECRET,
    })
  } else {
    role = baseRole
  }

  if (!role) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Surface a silent rebind to the user via a one-shot query param on /dashboard
  // so the page can show a toast explaining the active-role change.
  if (rebindFrom) {
    const target = new URL("/dashboard", req.url)
    target.searchParams.set("role_rebound", rebindFrom)
    const response = NextResponse.redirect(target)
    if (nextCookieValue) response.cookies.set(ROLE_SESSION_COOKIE_NAME, nextCookieValue, COOKIE_OPTIONS)
    return response
  }

  // Route-specific permission gate
  const route = req.nextUrl.pathname
  const routeEnum = findRouteEnum(route)

  if (routeEnum) {
    const allowedRoles = NAVIGATION_ITEMS_BY_ROUTE[routeEnum]?.roles ?? []
    const isAllowed = allowedRoles?.length === 0 ? true : allowedRoles.includes(role)

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  const response = NextResponse.next()
  if (nextCookieValue) response.cookies.set(ROLE_SESSION_COOKIE_NAME, nextCookieValue, COOKIE_OPTIONS)
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
