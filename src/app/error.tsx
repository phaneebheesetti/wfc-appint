"use client"

import { AppErrorFallback } from "@/components/app-error-fallback"

export default function ErrorRoot({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorFallback error={error} reset={reset} rootTestId="app-error-root" />
}
