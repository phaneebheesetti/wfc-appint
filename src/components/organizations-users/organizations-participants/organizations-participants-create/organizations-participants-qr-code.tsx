import copy from "copy-to-clipboard"
import html2canvas from "html2canvas"
import { toast } from "sonner"

import { QrCode } from "@/components/qr-code"
import { env } from "@/env"
import { api } from "@/trpc/react"

interface OrganizationsParticipantsQrCodeProps {
  organizationId: string
  campaignId?: string
}

export function OrganizationsParticipantsQrCode({ organizationId, campaignId }: OrganizationsParticipantsQrCodeProps) {
  const qrCodeUrl = `${env.NEXT_PUBLIC_APP_URL}/?organizationId=${organizationId}&campaignId=${campaignId}`

  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId! }, { enabled: !!campaignId })

  const handleCopyEmailTemplate = async () => {
    try {
      const qrElement = document.getElementById("qr-code")
      if (!qrElement) {
        toast.error("QR code element not found")
        return
      }

      const canvas = await html2canvas(qrElement)
      const qrImageBase64 = canvas.toDataURL("image/png")

      const emailTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; margin-bottom: 20px;">QR Code Access</h2>
            <p style="color: #666; margin-bottom: 20px;">Scan the QR code below to access the fundraising app:</p>
            <div style="text-align: center; margin: 30px 0;">
              <img src="${qrImageBase64}" alt="QR Code" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 10px;" />
            </div>
            <p style="color: #666; margin-top: 20px;">Or click this link directly: <a href="${qrCodeUrl}" style="color: #007bff;">${qrCodeUrl}</a></p>
          </div>
        `.trim()

      const plainTextTemplate = `QR Code Access

  Scan the QR code to access the fundraising app, or use this direct link: ${qrCodeUrl}`

      // Use modern Clipboard API for rich content
      if (navigator.clipboard?.write) {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([emailTemplate], { type: "text/html" }),
          "text/plain": new Blob([plainTextTemplate], { type: "text/plain" }),
        })

        await navigator.clipboard.write([clipboardItem])
        toast.success("Email template copied to clipboard")
      } else {
        // Fallback to plain text
        copy(plainTextTemplate)
        toast.success("Email template copied to clipboard")
      }
    } catch {
      // Fallback to simple text copy
      const fallbackText = `QR Code Access

  Scan the QR code to access the fundraising app, or use this direct link: ${qrCodeUrl}`

      copy(fallbackText)
      toast.success("Email template copied to clipboard")
    }
  }

  return (
    <QrCode
      url={qrCodeUrl}
      description="Share this QR code with participants or parents to let them self-register into the platform"
      downloadFilename={`qr-code.png`}
      label={campaign?.name ? `Fundraiser: ${campaign.name}` : undefined}
      handleCopyEmailTemplate={handleCopyEmailTemplate}
    />
  )
}
