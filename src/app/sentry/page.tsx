"use client"

import * as Sentry from "@sentry/nextjs"
import { AlertCircle, CheckCircle2, Loader2, Monitor, OctagonAlert, Server } from "lucide-react"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils/cn"

const SENTRY_TEST_BROWSER_MESSAGE = "Sentry test (browser): handled exception"

type ActionStatus =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; detail: string }
  | { phase: "error"; message: string }

/** Simulates a bad payload: `headline` is missing at runtime. */
function SentryTestFragileBanner({ data }: { data: { headline: string } }) {
  return <span className="sr-only">{data.headline.toUpperCase()}</span>
}

type TestActionBlockProps = {
  badge: string
  title: string
  description: string
  icon: typeof Monitor
  buttonLabel: string
  loadingLabel: string
  buttonVariant: "default" | "destructive" | "outline" | "secondary"
  status: ActionStatus
  onAction: () => void
}

function TestActionBlock({
  badge,
  title,
  description,
  icon: Icon,
  buttonLabel,
  loadingLabel,
  buttonVariant,
  status,
  onAction,
}: TestActionBlockProps) {
  const isLoading = status.phase === "loading"

  return (
    <Card className="overflow-hidden border-border/80 shadow-elev-1 transition-shadow hover:shadow-elev-2">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50",
              isLoading && "animate-pulse"
            )}
          >
            <Icon className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {badge}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-1.5 leading-relaxed">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-stretch gap-3 border-t bg-muted/20 px-6 py-4">
        <Button
          type="button"
          variant={buttonVariant}
          disabled={isLoading}
          className="w-full sm:w-auto sm:self-start"
          onClick={onAction}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {loadingLabel}
            </>
          ) : (
            buttonLabel
          )}
        </Button>

        {status.phase === "loading" && (
          <Alert className="border-muted-foreground/20 bg-background/80">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <AlertTitle className="text-sm">In progress</AlertTitle>
            <AlertDescription>
              Uses your local Sentry settings; this usually finishes in a couple of seconds.
            </AlertDescription>
          </Alert>
        )}
        {status.phase === "done" && (
          <Alert variant="success">
            <CheckCircle2 className="size-4" aria-hidden />
            <AlertTitle className="text-sm">Complete</AlertTitle>
            <AlertDescription>{status.detail}</AlertDescription>
          </Alert>
        )}
        {status.phase === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle className="text-sm">Failed</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  )
}

export default function SentryTestPage() {
  const [clientStatus, setClientStatus] = useState<ActionStatus>({ phase: "idle" })
  const [apiStatus, setApiStatus] = useState<ActionStatus>({ phase: "idle" })
  const [crashStatus, setCrashStatus] = useState<ActionStatus>({ phase: "idle" })
  const [pendingRenderCrash, setPendingRenderCrash] = useState(false)
  const [shouldRenderCrash, setShouldRenderCrash] = useState(false)

  useEffect(() => {
    if (!pendingRenderCrash) return
    setShouldRenderCrash(true)
  }, [pendingRenderCrash])

  const triggerClientError = async () => {
    setClientStatus({ phase: "loading" })
    try {
      const eventId = Sentry.captureException(new Error(SENTRY_TEST_BROWSER_MESSAGE))
      await Sentry.flush(2000)
      const idPart = eventId != null && eventId !== "" ? ` Sentry event ID: ${eventId}.` : ""
      setClientStatus({
        phase: "done",
        detail: `Browser event flushed.${idPart} Check Issues (allow a short delay).`,
      })
    } catch (e) {
      setClientStatus({
        phase: "error",
        message: e instanceof Error ? e.message : "Could not send or flush the browser event.",
      })
    }
  }

  const triggerApiError = async () => {
    setApiStatus({ phase: "loading" })
    try {
      const res = await fetch("/api/sentry/test-error")
      const body = (await res.json()) as { error?: string }
      const serverMsg = body.error != null ? ` Response: ${body.error}` : ""
      setApiStatus({
        phase: "done",
        detail: `Route responded with HTTP ${res.status}.${serverMsg} Look for a server-side issue in Sentry.`,
      })
    } catch (e) {
      setApiStatus({
        phase: "error",
        message: e instanceof Error ? e.message : "Could not reach the test route.",
      })
    }
  }

  const triggerRenderCrash = () => {
    setCrashStatus({ phase: "loading" })
    setShouldRenderCrash(false)
    setPendingRenderCrash(true)
  }

  if (shouldRenderCrash) {
    return <SentryTestFragileBanner data={{} as { headline: string }} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-2 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Sentry</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Error capture checks</h1>
          <p className="mx-auto max-w-xl text-pretty text-muted-foreground sm:mx-0 sm:text-base">
            Each action below sends a <span className="font-medium text-foreground">Sentry test</span> event so you can
            confirm browser, server, and error-boundary reporting. Set{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              NEXT_PUBLIC_SENTRY_ENABLED=true
            </code>{" "}
            and your DSN, then restart the dev server. The browser check calls{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">flush</code> so the event is not lost
            before upload.
          </p>
        </div>

        <div className="space-y-6">
          <TestActionBlock
            badge="Browser"
            title="Handled client error"
            description="Captures a handled exception in the browser SDK. Useful for validating the public DSN, tunnel, and client-side filters."
            icon={Monitor}
            buttonVariant="destructive"
            buttonLabel="Run browser check"
            loadingLabel="Sending…"
            status={clientStatus}
            onAction={() => void triggerClientError()}
          />

          <Separator />

          <TestActionBlock
            badge="Server"
            title="Failing API route"
            description="Calls GET /api/sentry/test-error. The handler throws inside withSentry so the Node SDK records it."
            icon={Server}
            buttonVariant="destructive"
            buttonLabel="Run server check"
            loadingLabel="Calling route…"
            status={apiStatus}
            onAction={() => void triggerApiError()}
          />

          <Separator />

          <TestActionBlock
            badge="Render"
            title="Error boundary path"
            description="Renders a child with invalid data (missing field), similar to a bad API payload. You should see the default app error view; use Try again to return to this page."
            icon={OctagonAlert}
            buttonVariant="destructive"
            buttonLabel="Run render check"
            loadingLabel="Applying bad props…"
            status={crashStatus}
            onAction={triggerRenderCrash}
          />
        </div>
      </div>
    </div>
  )
}
