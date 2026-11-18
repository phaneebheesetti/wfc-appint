import { logger } from "@/lib/pino"
import { t } from "@/server/api/core"

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */

const ARTIFICIAL_DELAY_IN_DEV = 200

export const timingMiddleware = t.middleware(async ({ next, path }) => {
  const routeLogger = logger.child({ route: path })

  const start = Date.now()

  // artificial delay in dev
  if (t._config.isDev) {
    await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY_IN_DEV))
  }

  const result = await next()

  const end = Date.now()
  const duration = end - start - (t._config.isDev ? ARTIFICIAL_DELAY_IN_DEV : 0)

  routeLogger.info({ duration }, `[TRPC] ${path} took ${duration}ms to execute`)

  return result
})
