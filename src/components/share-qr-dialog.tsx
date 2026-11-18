"use client"

import copy from "copy-to-clipboard"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface ShareQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  firstName: string
}

export function ShareQrDialog({ open, onOpenChange, url, firstName }: ShareQrDialogProps) {
  const handleCopyLink = () => {
    copy(url)
    toast.success("QR code link copied to clipboard")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableAnimations
        showCloseButton={false}
        className="
  bottom-0
  left-0
  top-auto
  w-full
  max-w-none
  translate-x-0
  translate-y-0
  gap-4
  rounded-t-card
  rounded-b-none
  border-x-0
  border-b-0
  p-6

  sm:left-1/2
  sm:top-1/2
  sm:bottom-auto
  sm:w-[calc(100vw-2rem)]
  sm:max-w-md
  sm:-translate-x-1/2
  sm:-translate-y-1/2
  sm:rounded-card
  sm:border
  sm:border-x
  sm:border-b
"
      >
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
        <div className="text-center font-semibold text-lg">QR Code</div>

        <div className="text-center text-sm text-muted-foreground">
          Supporters can scan this to open {firstName}&apos;s sales page.
        </div>

        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4">
          <QRCode value={url} fgColor="#6e3332" />

          <div className="break-all text-center text-xs text-muted-foreground">{url}</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
            Copy Link
          </Button>

          <Button className="flex-1 bg-success hover:bg-success active:bg-success" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
