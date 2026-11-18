"use client"

import { useUser } from "@clerk/nextjs"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Set user context for Sentry
      Sentry.setUser({
        id: user?.publicMetadata?.databaseId ?? undefined,
        email: user.primaryEmailAddress?.emailAddress ?? undefined,
        username: user.username ?? undefined,
      })

      // Set additional context
      Sentry.setContext("user", {
        firstName: user?.firstName,
        lastName: user?.lastName,
        createdAt: user?.createdAt,
        lastSignInAt: user?.lastSignInAt,
        role: user?.publicMetadata?.role,
        databaseId: user?.publicMetadata?.databaseId,
        clerkId: user?.id,
      })

      // Set tags for better filtering
      Sentry.setTag("user.role", user?.publicMetadata?.role)
      Sentry.setTag("user.databaseId", user?.publicMetadata?.databaseId)
    } else if (isLoaded && !isSignedIn) {
      // Clear user context when signed out
      Sentry.setUser(null)
      Sentry.setContext("user", null)
      // Clear user-specific tags
      Sentry.setTag("user.role", undefined)
      Sentry.setTag("user.databaseId", undefined)
      Sentry.setTag("user.authenticated", false)
      Sentry.setTag("user.emailVerified", undefined)
    }
  }, [isLoaded, isSignedIn, user])

  return <>{children}</>
}
