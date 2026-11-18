// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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

  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
    Sentry.winterCGFetchIntegration({
      breadcrumbs: true,
      shouldCreateSpanForRequest: url => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        return !url || !supabaseUrl || !url.startsWith(`${supabaseUrl}/rest`)
      },
    }),
  ],

  ignoreErrors: [
    "The `util._extend` API is deprecated",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

  // Enhanced beforeSend to filter out noise
  beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint): Sentry.ErrorEvent | null {
    // Filter out known non-critical edge errors
    if (event.exception) {
      const error = hint.originalException

      if (error instanceof Error) {
        // Filter out network errors that are not actionable
        if (error.message.includes("NetworkError") && error.message.includes("Failed to fetch")) {
          return null
        }
        // Filter out chunk loading errors
        if (error.message.includes("Loading chunk") || error.message.includes("ChunkLoadError")) {
          return null
        }
      }
    }

    return event
  },
})
