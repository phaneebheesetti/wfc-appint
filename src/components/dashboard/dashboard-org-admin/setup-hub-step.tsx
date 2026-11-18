"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import { Check, ChevronDown, CirclePlay, Copy, Info, type LucideIcon, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "react-day-picker"

import { cn } from "@/utils/cn"

export type StepState = "done" | "active" | "pending" | "disabled"

type SetupHubStepProps = {
  stepNumber?: number
  title: string
  icon: LucideIcon
  state: StepState
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children?: ReactNode
  attentionRequired?: boolean
  videoUrl?: string
  assignerEmail: string
}

export function SetupHubStep({
  stepNumber,
  title,
  icon: Icon,
  state,
  isOpen,
  onOpenChange,
  children,
  attentionRequired = false,
  videoUrl,
  assignerEmail,
}: SetupHubStepProps) {
  const isDone = state === "done"
  const isActive = state === "active"
  const isDisabled = state === "disabled"
  const [showVideo, setShowVideo] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    await navigator.clipboard.writeText(assignerEmail)
    setCopied(true)
  }
  return (
    <div className="rounded-card border bg-card">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="flex w-full items-center gap-4 px-4 py-4 text-left"
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isDone
              ? "bg-green-600 text-white"
              : isActive
                ? "bg-red-900 text-white"
                : isDisabled
                  ? "bg-gray-100 text-gray-400"
                  : "bg-rose-50 text-rose-300"
          )}
        >
          {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {stepNumber && <span>Step {stepNumber}</span>}

            {isActive && (
              <span className="rounded-full bg-red-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Up Next
              </span>
            )}

            {isDone && (
              <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Done
              </span>
            )}
          </div>

          <div className="mt-0.5 text-base font-semibold">
            {title} {attentionRequired && <span className="text-xs text-yellow-700">Attention Required</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {videoUrl && (
            <div
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation()
                setShowVideo(true)
              }}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setShowVideo(true)
                }
              }}
              className="flex cursor-pointer items-center gap-1 text-sm font-medium text-red-900 hover:underline"
            >
              <CirclePlay className="h-4 w-4" />
              How to
            </div>
          )}

          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && children && (
        <div className="flex flex-col border-t px-6 py-4">
          <div>{children}</div>

          <div className="mt-4 flex gap-2 justify-end">
            <span>Need help?</span>

            <Popover
              onOpenChange={open => {
                if (!open) setCopied(false)
              }}
            >
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" side="top" className="w-auto rounded-lg border p-4 shadow-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">{assignerEmail}</span>

                    <Button onClick={copyEmail}>
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 shadow"
            >
              <X className="h-5 w-5" />
            </button>

            <video controls autoPlay className="max-h-[80vh] max-w-[80vw] rounded-lg shadow-2xl">
              <source src={videoUrl} type="video/mp4" />
            </video>
          </div>
        </div>
      )}
    </div>
  )
}
