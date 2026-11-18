import { Twilio } from "twilio"

import { env } from "@/env"

const accountSid = env.TWILIO_ACCOUNT_SID
const authToken = env.TWILIO_AUTH_TOKEN

const twilioPhoneNumber = env.TWILIO_PHONE_NUMBER

export const sendSms = async (to: string, message: string) => {
  const client = new Twilio(accountSid, authToken)

  const result = await client.messages.create({
    body: message,
    to: to,
    from: twilioPhoneNumber,
  })
  return result
}
