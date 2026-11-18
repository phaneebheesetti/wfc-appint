import type { CsvOutput } from "export-to-csv"
import PDFDocument from "pdfkit"
import qr from "qr-image"

import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { env } from "@/env"
import { createClient } from "@/lib/supabase/server"

type UserInfoForQRCode = {
  pin: string
  email: string
  first_name: string
  last_name: string
  teacher_name: string
  grade: string
}

export const uploadCampaignSummaryCsv = async ({
  campaignId,
  fileName,
  fileContent,
}: {
  campaignId: string
  fileName: string
  fileContent: CsvOutput
}) => {
  const supabase = await createClient()

  const campaignSummaryFilePath = `${campaignId}-${fileName}`
  const bucketName = "summary"

  const { data, error }: { data: { path: string } | null; error: Error | null } = await supabase.storage
    .from(bucketName)
    .upload(campaignSummaryFilePath, Buffer.from(fileContent as unknown as string), {
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload summary: ${error.message}`)
  }

  if (!data) {
    throw new Error("No data returned from Supabase")
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)

  return publicUrlData.publicUrl
}

export function generateCampaignQrCodesPDF(users: UserInfoForQRCode[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument()

    // Collect PDF data chunks
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    users.forEach((user, index) => {
      if (index > 0) doc.addPage()

      const appUrl = env.NEXT_PUBLIC_APP_URL
      const paymentPinURL = `${appUrl}/payment?pin=${user.pin}`
      // Generate QR code as PNG buffer
      const qrBuffer = qr.imageSync(paymentPinURL, { type: "png" })

      // Add participant first and last first digit with pin
      doc.fontSize(14).text(`Participant: ${user.first_name} ${user.last_name}`, 50, 50)
      doc.text(`PIN: ${user.pin}`, 50, 70)

      doc.fontSize(14).text(`${GRADE_LABEL}: ${user.grade}`, 50, 90)
      doc.fontSize(14).text(`${TEACHER_LABEL}: ${user.teacher_name}`, 50, 110)

      // Add image from buffer (QR Code)
      doc.image(qrBuffer, 35, 130, { width: 150 })
    })

    doc.end()
  })
}
