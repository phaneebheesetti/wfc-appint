"use client"

import { render } from "@react-email/render"
import { createElement, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/utils/cn"

import { EMAIL_TEMPLATES } from "./emails-registry"

export function EmailsList() {
  const [selectedId, setSelectedId] = useState<string | null>(EMAIL_TEMPLATES[0]?.id ?? null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const selectedEntry = selectedId ? EMAIL_TEMPLATES.find(t => t.id === selectedId) : null

  useEffect(() => {
    if (!selectedEntry) {
      setPreviewHtml(null)
      setPreviewError(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)
    const Component = selectedEntry.component
    const props = selectedEntry.component.PreviewProps ?? {}
    const element = createElement(Component, props)
    render(element)
      .then(html => {
        if (!cancelled) {
          setPreviewHtml(html)
          setPreviewError(null)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : "Failed to render preview")
          setPreviewHtml(null)
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEntry])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <nav aria-label="Email templates" className="flex flex-shrink-0 flex-wrap gap-2">
        {EMAIL_TEMPLATES.map(template => (
          <Button
            key={template.id}
            variant={selectedId === template.id ? "secondary" : "outline"}
            className={cn("justify-start", selectedId === template.id && "font-medium")}
            onClick={() => setSelectedId(template.id)}
          >
            {template.name}
          </Button>
        ))}
      </nav>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {!selectedEntry ? (
            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
              Select a template to preview
            </div>
          ) : previewLoading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Rendering…</div>
          ) : previewError ? (
            <div className="flex flex-1 items-center justify-center p-8 text-destructive">{previewError}</div>
          ) : previewHtml ? (
            <div className="min-h-0 flex-1 overflow-auto border-0 p-0">
              <iframe
                key={selectedId}
                sandbox="allow-same-origin"
                srcDoc={previewHtml}
                title={selectedEntry.name}
                className="min-h-full w-full border-0"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
