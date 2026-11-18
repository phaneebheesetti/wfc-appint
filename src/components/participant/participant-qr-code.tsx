import { QrCode } from "@/components/qr-code"
import { env } from "@/env"

interface ParticipantQRCodeProps {
  pin: string
  showTitle?: boolean
  className?: string
}

export function ParticipantQRCode({ pin, showTitle = true, className }: ParticipantQRCodeProps) {
  const qrCodeUrl = `${env.NEXT_PUBLIC_APP_URL}/payment?pin=${pin}`

  return (
    <QrCode
      url={qrCodeUrl}
      title={showTitle ? "Make a Sale — Share Your QR Code!" : undefined}
      description="When someone scans this QR code, they can pay you for their chocolate order using a card, ACH, or other digital
        payment"
      label={`PIN: ${pin}`}
      downloadFilename={`qr-code-${pin}.png`}
      className={className}
    />
  )
}
