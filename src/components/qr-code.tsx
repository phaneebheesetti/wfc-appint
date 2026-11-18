import copy from "copy-to-clipboard"
import html2canvas from "html2canvas"
import { Copy, Download, ExternalLink, Image, Link as LinkIcon, Mail, Printer } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import QRCode from "react-qr-code"
import { useReactToPrint } from "react-to-print"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DropdownButton } from "@/components/ui/button/dropdown-button"
import { cn } from "@/utils/cn"

interface QrCodeProps {
  url: string
  title?: string
  description?: string
  label?: string
  downloadFilename?: string
  className?: string
  handleCopyEmailTemplate?: () => void
}

export function QrCode({
  url,
  title,
  description,
  label,
  downloadFilename = "qr-code.png",
  className,
  handleCopyEmailTemplate,
}: QrCodeProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const reactToPrintFn = useReactToPrint({
    contentRef,
    pageStyle: "@page { size: 210mm 297mm; margin: 0; padding: 0; }",
  })

  const handleCopyLink = () => {
    copy(url)
    toast.success("QR code link copied to clipboard")
  }

  const handleDownloadQRCode = async () => {
    const qrElement = document.getElementById("qr-code")
    if (!qrElement) {
      toast.error("QR code element not found")
      return
    }

    try {
      const canvas = await html2canvas(qrElement)
      const image = canvas.toDataURL("image/png")

      // Create a temporary link element
      const link = document.createElement("a")
      link.href = image
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`QR code image downloaded successfully`, { duration: 10000 })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save QR code")
    }
  }

  return (
    <div className={cn("flex flex-col gap-2 border-2 border-dashed p-2", className)}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-xs text-muted-foreground">{description}</div>}

      <div id="qr-code" ref={contentRef} className="flex flex-col items-center justify-center p-4 gap-2">
        <QRCode value={url} fgColor="#6e3332" />
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1">
          <Link href={url} target="_blank" rel="noreferrer" className="w-full block">
            <Button className="w-full">
              <ExternalLink />
              Open
            </Button>
          </Link>
        </div>
        <div className="flex-1">
          <DropdownButton
            text="Copy"
            icon={Copy}
            variant="outline"
            className="md:w-full"
            buttons={[
              {
                text: "Copy Link",
                icon: LinkIcon,
                onClick: handleCopyLink,
              },
              ...(handleCopyEmailTemplate
                ? [
                    {
                      text: "Copy Email Template",
                      icon: Mail,
                      onClick: handleCopyEmailTemplate,
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <div className="flex-1">
          <DropdownButton
            text="Export"
            icon={Download}
            variant="outline"
            className="md:w-full"
            buttons={[
              {
                text: "Download",
                icon: Image,
                onClick: () => void handleDownloadQRCode(),
              },
              {
                text: "Print",
                icon: Printer,
                onClick: () => reactToPrintFn(),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
