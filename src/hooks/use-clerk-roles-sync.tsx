"use client"

import { useClerk, useUser } from "@clerk/nextjs"
import { useEffect, useRef } from "react"

// Keeps the target session in sync with role grants/revokes performed in
// another session (e.g., a WFC admin adding a second role to this user's
// email), so the role switcher updates without a manual page refresh.
//
// Two caches to bust on every tick:
//   1. user.publicMetadata.roles — read by the footer role switcher via
//      useUser(); refreshed by user.reload() (hits /v1/me).
//   2. sessionClaims.user_roles — read by the middleware via the Clerk JWT
//      template projection of publicMetadata.roles; only re-mints on a fresh
//      token, hence getToken({ skipCache: true }).
//
// Triggers: an initial run on mount (so stale state catches up immediately),
// tab focus, visibilitychange, plus a low-frequency safety poll. All reload
// attempts no-op when the tab is hidden to avoid burning Clerk quota.
export const useClerkRolesSync = ({ intervalMs = 30_000 }: { intervalMs?: number } = {}) => {
  const { user, isSignedIn, isLoaded } = useUser()
  const clerk = useClerk()
  // Depend on the stable user id and read the latest user through a ref. Depending on the `user` object made this
  // effect (and its immediate token mint + reload) re-run every time Clerk published a new user object, which
  // could turn into a continuous reload loop.
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  })
  const userId = user?.id

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return

    let cancelled = false

    const reload = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      try {
        await clerk.session?.getToken({ skipCache: true })
        if (cancelled) return
        await userRef.current?.reload()
      } catch {
        // best-effort; the next tick will retry
      }
    }

    void reload()

    const trigger = () => void reload()
    const onVisibility = () => {
      if (document.visibilityState === "visible") trigger()
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", trigger)
    const intervalId = window.setInterval(trigger, intervalMs)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("focus", trigger)
      window.clearInterval(intervalId)
    }
  }, [isLoaded, isSignedIn, userId, clerk, intervalMs])
}
