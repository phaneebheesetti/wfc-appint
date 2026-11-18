"use client"

import { AlertCircle } from "lucide-react"
import { useIsClient } from "usehooks-ts"

import { Alert, AlertTitle } from "@/components/ui/alert"

export function StagingAlert() {
  const isClient = useIsClient()
  if (!isClient) return null

  let environment = "production"

  if (window.location.hostname === "staging.fundraising-app.worldsfinestchocolate.com") {
    environment = "staging"
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    environment = "localhost"
  }

  if (environment === "production") return null

  return (
    <Alert
      variant="destructive"
      className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center p-2 rounded-none text-sm"
    >
      <AlertTitle className="flex items-center gap-2">
        <AlertCircle className="size-4" />
        You&apos;re currently on the <i>{environment}</i> environment, real production data won&apos;t be shown or
        affected!
        <AlertCircle className="size-4" />
      </AlertTitle>
    </Alert>
  )
}
