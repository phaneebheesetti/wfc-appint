"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Check, ChevronDown, CirclePlay, type LucideIcon, X } from "lucide-react"
import { type ReactNode, useState } from "react"

import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/utils/cn"

type StepState = "done" | "active" | "pending"

type OnboardingStepProps = {
  stepNumber: number
  title: string
  icon: LucideIcon
  state: StepState
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children?: ReactNode
  videoUrl?: string
}

export function OnboardingStep({
  stepNumber,
  title,
  icon: Icon,
  state,
  isOpen,
  onOpenChange,
  children,
  videoUrl,
}: OnboardingStepProps) {
  const isDone = state === "done"
  const isActive = state === "active"
  const [showVideo, setShowVideo] = useState(false)
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
            isDone ? "bg-green-600 text-white" : isActive ? "bg-red-900 text-white" : "bg-rose-50 text-rose-300"
          )}
        >
          {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step {stepNumber}
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
          <div className="mt-0.5 text-base font-semibold">{title}</div>
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

      {isOpen && children && <div className="border-t px-6 py-4">{children}</div>}
      <Dialog open={showVideo && !!videoUrl} onOpenChange={setShowVideo}>
        <DialogPortal>
          <DialogOverlay className="bg-black/70 backdrop-blur-none" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 focus:outline-none"
            onClick={() => setShowVideo(false)}
          >
            <DialogTitle className="sr-only">{title} — how-to video</DialogTitle>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowVideo(false)}
                className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 shadow"
              >
                <X className="h-5 w-5" />
              </button>

              <video
                controls
                autoPlay
                className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
                src={videoUrl}
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  )
}

export type { StepState }
