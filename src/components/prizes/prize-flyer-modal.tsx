"use client"

import { Gift } from "lucide-react"

import { ImageWithFallback } from "@/components/ui/image"
import { Modal } from "@/components/ui/modal"

export type PrizeFlyerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName: string
  subtitle?: string | null
  flyerImageUrl: string
}

export const isPdfFlyer = (url: string) => {
  try {
    return new URL(url, "https://placeholder.invalid").pathname.toLowerCase().endsWith(".pdf")
  } catch {
    return url.toLowerCase().split(/[?#]/)[0]?.endsWith(".pdf") ?? false
  }
}

export function PrizeFlyerModal({ open, onOpenChange, templateName, subtitle, flyerImageUrl }: PrizeFlyerModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${templateName} — Prize Flyer`}
      description={subtitle ?? undefined}
      icon={Gift}
      iconClassName="text-rose-600"
      iconContainerClassName="h-9 w-9 rounded-control bg-rose-100"
      className="max-w-lg"
    >
      <div className="relative mx-auto aspect-[8.5/11] max-h-[72vh] w-full select-none overflow-hidden rounded-card border bg-white">
        <ImageWithFallback
          src={flyerImageUrl}
          className="object-contain"
          alt={`${templateName} prize flyer — the prize levels and how many cases are required to earn each`}
          sizes="(max-width: 640px) 92vw, 620px"
          draggable={false}
          fill
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Preview only. Prize levels are applied to the fundraiser when you save this step.
      </p>
    </Modal>
  )
}
