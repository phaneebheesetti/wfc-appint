"use client"

import * as Sentry from "@sentry/nextjs"
import NextError from "next/error"
import { useEffect } from "react"

type AppErrorFallbackProps = {
  error: Error & { digest?: string }
  reset: () => void
  rootTestId?: string
}

export function AppErrorFallback({ error, reset, rootTestId }: AppErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div data-testid={rootTestId} className="flex min-h-[50vh] flex-col">
      {/* App Router has no status code for these errors; NextError still requires a number. */}
      <NextError statusCode={0} />
      <p className="mx-auto max-w-md px-4 text-center text-sm text-muted-foreground">
        With Sentry enabled, this failure should appear in your project. You can retry the page below.
      </p>
      <div className="flex justify-center p-6">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-elev-1 hover:bg-accent hover:text-accent-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
