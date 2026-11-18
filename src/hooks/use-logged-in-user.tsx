import { useAuth, useUser } from "@clerk/nextjs"
import { useEffect, useMemo, useState } from "react"

import { type RolesEnum } from "@/constants/roles"
import { ROLE_SESSION_COOKIE_NAME, decodeRoleSessionCookieUnsafe } from "@/lib/role-session"

const readActiveRoleCookie = () => {
  if (typeof document === "undefined") return null
  for (const pair of document.cookie.split(";")) {
    const [k, ...rest] = pair.trim().split("=")
    if (k === ROLE_SESSION_COOKIE_NAME) {
      return decodeRoleSessionCookieUnsafe(rest.join("=") ? decodeURIComponent(rest.join("=")) : undefined)
    }
  }
  return null
}

type ClerkRoleEntry = { databaseId: string; role: RolesEnum }

export const useLoggedInUser = () => {
  const { user, isLoaded, isSignedIn } = useUser()
  // sessionClaims is keyed off the JWT raw string in Clerk's provider memo, so
  // it re-renders on every token refresh — unlike useUser() whose User instance
  // is mutated in place by user.reload() and therefore does NOT push a new
  // context value when only publicMetadata changes. Prefer the JWT projection
  // of publicMetadata.roles (set up via the Clerk JWT template as `user_roles`)
  // so cross-session role grants/revokes propagate without a hard refresh.
  const { sessionClaims } = useAuth()
  const [cookieActive, setCookieActive] = useState<ReturnType<typeof readActiveRoleCookie>>(null)

  useEffect(() => {
    setCookieActive(readActiveRoleCookie())
  }, [user?.id])

  const jwtRoles = sessionClaims?.user_roles as ClerkRoleEntry[] | undefined

  return useMemo(
    () => ({
      user,
      isLoading: !isLoaded,
      isLoaded,
      isSignedIn,
      loggedInRole: cookieActive?.role ?? user?.publicMetadata.role,
      availableRoles: jwtRoles ?? user?.publicMetadata.roles ?? [],
      loggedInUserId: cookieActive?.databaseId ?? user?.publicMetadata.databaseId,
      loggedInClerkId: user?.id,
    }),
    [user, isLoaded, isSignedIn, cookieActive, jwtRoles]
  )
}
