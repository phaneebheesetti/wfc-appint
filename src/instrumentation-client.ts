// Client bootstrap for Sentry with Turbopack / Next.js 15+ App Router.
// See https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
import * as Sentry from "@sentry/nextjs"

import "../sentry.client.config"

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
