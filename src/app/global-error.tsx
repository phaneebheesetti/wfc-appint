"use client"

import { AppErrorFallback } from "@/components/app-error-fallback"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        {/* Replaces the root layout when active; document shell is required. */}
        <AppErrorFallback error={error} reset={reset} />
      </body>
    </html>
  )
}
