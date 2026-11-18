"use client"

import { ArrowRight, Check, Copy, HelpCircle, Info, ListChecks, PartyPopper, Rocket, Sparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DashboardNotificationPopupProps {
  open: boolean
  // Who assigned the fundraiser (the Fundraising Consultant) and the fundraiser name, for the copy.
  assignerName: string
  assignerEmail: string
  assignerRoleLabel: string
  fundraiserName: string
  // Dismiss (close button / Esc / outside click) — closes and returns to the page, no navigation.
  onDismiss: () => void
  // CTA — closes and navigates into the assigned fundraiser's Setup Hub.
  onFinishSetup: () => void
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

export function DashboardNotificationPopup({
  open,
  assignerName,
  assignerEmail,
  assignerRoleLabel,
  fundraiserName,
  onDismiss,
  onFinishSetup,
}: DashboardNotificationPopupProps) {
  const assignerFirstName = assignerName.trim().split(/\s+/).filter(Boolean)[0] ?? assignerName
  const [copied, setCopied] = useState(false)
  // The popover renders in a portal, so it needs the dialog element to stay inside the modal.
  const [dialogElement, setDialogElement] = useState<HTMLDivElement | null>(null)
  const [assignerEmailLocalPart = "", ...assignerEmailDomainParts] = assignerEmail.split("@")
  const assignerEmailDomain = assignerEmailDomainParts.join("@")

  const copyEmail = async () => {
    await navigator.clipboard.writeText(assignerEmail)
    setCopied(true)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) onDismiss()
      }}
    >
      <DialogContent
        ref={setDialogElement}
        className="flex w-[460px] max-w-[calc(100vw-2rem)] max-h-[96.5dvh] flex-col gap-0 overflow-hidden rounded-card border-0 p-0 shadow-elev-3"
        closeButtonClassName="text-white"
      >
        {/* Celebratory header — never shrinks */}
        <div className="relative shrink-0 bg-primary px-6 pb-4 pt-5 text-center text-primary-foreground">
          <span className="absolute left-4 top-4 text-white/60 text-lg select-none" aria-hidden>
            ✦
          </span>
          <span className="absolute right-10 top-10 text-white/40 text-sm select-none" aria-hidden>
            ✦
          </span>
          <div className="mb-2 flex justify-center">
            <PartyPopper className="h-6 w-6" aria-hidden />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> New Fundraiser Assigned
          </span>
          <DialogTitle className="mt-2 font-serif text-2xl font-bold">Finish Fundraiser Setup</DialogTitle>
        </div>

        {/* Scrollable content — grows to fill available space */}
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden px-6 py-5">
          {/* Assigned by */}
          <div className="flex items-center gap-3 rounded-card border bg-muted/30 px-4 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-semibold text-white">
              {getInitials(assignerName)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned By</div>
              <div className="truncate font-semibold">{assignerName}</div>
              <div className="text-sm text-muted-foreground">{assignerRoleLabel}</div>
            </div>
          </div>

          <DialogDescription className="text-base text-foreground">
            <span className="font-semibold">{assignerFirstName}</span> has assigned the{" "}
            <span className="font-semibold text-primary">{fundraiserName}</span> fundraiser to you. In just a few quick
            steps, your fundraiser will be ready to launch.
          </DialogDescription>

          {/* What's Next */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&apos;s Next</div>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <ListChecks className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Finish setup. The estimated time to complete is 8 minutes.
              </li>
              <li className="flex items-center gap-2.5">
                <Rocket className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Launch and start raising money
              </li>
              <Popover
                onOpenChange={open => {
                  if (!open) setCopied(false)
                }}
              >
                {/* Anchored to the whole row so the popover lines up with the row's right edge, inside the modal. */}
                <PopoverAnchor asChild>
                  <li className="flex items-center gap-2.5">
                    <HelpCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {assignerFirstName} is one click away if you get stuck
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </li>
                </PopoverAnchor>

                <PopoverContent
                  align="end"
                  collisionBoundary={dialogElement}
                  collisionPadding={12}
                  className="w-fit max-w-[min(23rem,var(--radix-popover-content-available-width))]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-sm">
                        {assignerEmailLocalPart}
                        {assignerEmailDomain && (
                          <>
                            <wbr />@{assignerEmailDomain}
                          </>
                        )}
                      </span>

                      <Button variant="ghost" size="icon" className="shrink-0" onClick={copyEmail}>
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </ul>
          </div>
        </div>

        {/* Button pinned at bottom — never shrinks, always full height */}
        <div className="shrink-0 px-6 pb-6 pt-3">
          <Button type="button" size="lg" className="w-full" onClick={onFinishSetup}>
            <Rocket /> Finish Setup <ArrowRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
