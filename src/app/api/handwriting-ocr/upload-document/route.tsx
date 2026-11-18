import { type NextRequest, NextResponse } from "next/server"

import { env } from "@/env"
import { type HandwritingOCRUploadResponse } from "@/types/handwriting-ocr"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (req: NextRequest) => {
  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const uploadFormData = new FormData()
  uploadFormData.append("file", file)
  uploadFormData.append("action", "tables")

  const response = await fetch("https://www.handwritingocr.com/api/v3/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HANDWRITING_OCR_API_KEY}`,
      Accept: "application/json",
    },
    body: uploadFormData,
  })

  if (!response.ok) {
    throw new Error(`Handwriting OCR API responded with status: ${response.status}`)
  }

  const data = (await response.json()) as HandwritingOCRUploadResponse

  return NextResponse.json({ data }, { status: 200 })
})
