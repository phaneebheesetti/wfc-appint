"use client"

import { useUser } from "@clerk/nextjs"
import posthog from "posthog-js"
import { PostHogProvider as PostHogProviderFromLib } from "posthog-js/react"
import { useEffect } from "react"

import { env } from "@/env"

function formatDaysAgo(date: Date | null | undefined): string | null {
  if (!date) return null
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

function formatDateForAnalytics(date: Date | null | undefined): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,

      // Page tracking
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,

      // Performance monitoring
      capture_performance: true,

      // Optimize costs - only create profiles for identified users
      person_profiles: "identified_only",

      // DISABLE session recording (Sentry already does this)
      disable_session_recording: true,

      // Persistence in localStorage
      persistence: "localStorage",

      // Performance optimization
      loaded: posthog => {
        if (process.env.NODE_ENV === "development") {
          posthog.debug()
        }
      },
    })
  }, [])

  // User identification with Clerk
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Identify user with PostHog
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.publicMetadata?.role,
        databaseId: user.publicMetadata?.databaseId,
        clerkId: user.id,
      })

      const lastSignInDaysAgo = formatDaysAgo(user.lastSignInAt)

      // Set user properties
      posthog.setPersonProperties({
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        role: user.publicMetadata?.role,
        databaseId: user.publicMetadata?.databaseId,
        clerkId: user.id,
      })

      // Set tags for better filtering
      posthog.register({
        user_role: user.publicMetadata?.role,
        user_database_id: user.publicMetadata?.databaseId,
        last_login_date: formatDateForAnalytics(user.lastSignInAt),
        last_login_at: lastSignInDaysAgo,
      })
    } else if (isLoaded && !isSignedIn) {
      // Reset user context when signed out
      posthog.reset()
    }
  }, [isLoaded, isSignedIn, user])

  return <PostHogProviderFromLib client={posthog}>{children}</PostHogProviderFromLib>
}
