import * as Sentry from "@sentry/node"

import { t } from "@/server/api/core"

export const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  })
)
