import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/env"
import { type HandwritingOCRDownloadResponse } from "@/types/handwriting-ocr"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  id: z.string(),
})

export const POST = withSentry(async (req: NextRequest) => {
  const body = bodySchema.parse(await req.json())
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: "No id provided" }, { status: 400 })
  }

  const response = await fetch(`https://www.handwritingocr.com/api/v3/documents/${id}.json`, {
    headers: {
      Authorization: `Bearer ${env.HANDWRITING_OCR_API_KEY}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Handwriting OCR API responded with status: ${response.status}`)
  }

  const data = (await response.json()) as HandwritingOCRDownloadResponse

  return NextResponse.json({ data }, { status: 200 })
})
