"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CirclePlay, X } from "lucide-react"
import { useState } from "react"

import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog"

interface HowToVideoButtonProps {
  title: string
  videoUrl: string
}

export function HowToVideoButton({ title, videoUrl }: HowToVideoButtonProps) {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowVideo(true)}
        className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-medium text-red-900 hover:underline"
      >
        <CirclePlay className="h-4 w-4" />
        How to
      </button>

      <Dialog open={showVideo} onOpenChange={setShowVideo}>
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
                aria-label="Close video"
                className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 shadow"
              >
                <X className="h-5 w-5" />
              </button>

              <video
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
                src={videoUrl}
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  )
}
