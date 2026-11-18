import { Modal } from "@/components/ui/modal"

import { ParticipantQRCode } from "./participant-qr-code"

interface ParticipantQRCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pin: string
}

export function ParticipantQRCodeModal({ open, onOpenChange, pin }: ParticipantQRCodeModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Make a Sale — Share Your QR Code!"
      description="Share this QR code with participants to accept payments"
      className="gap-2"
    >
      <ParticipantQRCode pin={pin} className="border-none p-0" showTitle={false} />
    </Modal>
  )
}
