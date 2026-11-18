import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { env } from "@/env"
import { sendSms } from "@/server/services/sms-messaging"
import { withSentry } from "@/utils/api"

const requestSchema = z.object({
  phoneNumbers: z.array(z.string()),
  message: z.string(),
  includeLink: z.boolean(),
})

const appUrl = env.APP_SHORT_LINK

type SendResult = {
  phoneNumber: string
  success: boolean
  error: unknown
}

export const POST = withSentry(async (request: NextRequest) => {
  const body = requestSchema.parse(await request.json())
  const { phoneNumbers, message, includeLink } = body

  const results = await Promise.allSettled(
    phoneNumbers.map(async phoneNumber => {
      try {
        const finalMessage = includeLink ? `${message}\n\n${appUrl}` : message
        const response = await sendSms(phoneNumber, finalMessage)

        const success = response.status === "queued" || response.status === "sent"
        return { phoneNumber, success, error: response.errorMessage } as SendResult
      } catch (error) {
        return { phoneNumber, success: false, error } as SendResult
      }
    })
  )

  const successfulSends = results.filter(
    (result): result is PromiseFulfilledResult<SendResult> => result.status === "fulfilled" && result.value.success
  )

  const failedSends = results.filter(
    (result): result is PromiseFulfilledResult<SendResult> => result.status === "fulfilled" && !result.value.success
  )

  return NextResponse.json(
    {
      data: {
        success: true,
        total: phoneNumbers.length,
        successful: successfulSends.length,
        failed: failedSends.length,
        failedNumbers: failedSends.map(result => result.value.phoneNumber),
      },
    },
    { status: 200 }
  )
})
