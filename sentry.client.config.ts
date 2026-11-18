// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs"
import { supabaseIntegration } from "@supabase/sentry-js-integration"
import { SupabaseClient } from "@supabase/supabase-js"

Sentry.init({
  enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true",

  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),

  // Profiling session sample rate (v11 replacement for `profilesSampleRate`); "trace" auto-starts/stops with traces
  profileSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE ?? "0.1"),
  profileLifecycle: "trace",

  // Sentry v11 replaced `sendDefaultPii` with `dataCollection`. These settings keep the request data that v10.x
  // collected (needed for debugging and security monitoring): cookies, request headers, incoming request bodies
  // (up to 10 KB), URL and query string. Things v10 did NOT collect stay off: client IP / auto user info,
  // response headers, and outgoing-request / response bodies.
  // Note: v11 always redacts values whose names look sensitive (e.g. `authorization`, `*session*`, `*token*`)
  // as "[Filtered]"; this is built into the SDK and is not controlled by these options.
  dataCollection: {
    userInfo: false,
    cookies: true,
    httpHeaders: { request: true, response: false },
    httpBodies: ["incomingRequest"],
    urlQueryParams: true,
  },

  // Capture Replay for 0% of normal sessions, but 100% of sessions with an error
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
  ],

  ignoreErrors: [
    "The `util._extend` API is deprecated",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "ChunkLoadError",
    "Loading chunk",
    "Loading CSS chunk",
    "Script error",
    "Network request failed",
    "Failed to fetch",
    "AbortError",
    "TimeoutError",
  ],

  // Enhanced beforeSend to filter out noise
  beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint): Sentry.ErrorEvent | null {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = hint.originalException

      if (error instanceof Error) {
        // Filter out network errors that are not actionable
        if (error.message.includes("NetworkError") && error.message.includes("Failed to fetch")) {
          return null
        }
        // Filter out chunk loading errors that are usually handled by Next.js
        if (error.message.includes("Loading chunk") || error.message.includes("ChunkLoadError")) {
          return null
        }
      }
    }

    return event
  },
})

// Lazy load integrations
void import("@sentry/nextjs").then(lazyLoadedSentry => {
  Sentry.addIntegration(
    lazyLoadedSentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    })
  )
  Sentry.addIntegration(
    lazyLoadedSentry.browserTracingIntegration({
      shouldCreateSpanForRequest: url => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        return !url || !supabaseUrl || !url.startsWith(`${supabaseUrl}/rest`)
      },
    })
  )
  Sentry.addIntegration(lazyLoadedSentry.browserProfilingIntegration())
})
