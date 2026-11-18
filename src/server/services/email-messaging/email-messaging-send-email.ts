import sgMail, { type MailDataRequired } from "@sendgrid/mail"
import * as Sentry from "@sentry/nextjs"

import { APP_NAME } from "@/constants/app"
import { env } from "@/env"

interface sendEmailProps {
  to: string[]
  cc?: string[]
  fromName?: string
  subject: string
  html: string
  attachments?: MailDataRequired["attachments"]
  emailType?: string
  sendMultiple?: boolean
}

export const sendEmail = async ({
  to,
  cc = [],
  fromName = APP_NAME,
  subject,
  html,
  attachments = [],
  emailType,
  sendMultiple = true,
}: sendEmailProps) => {
  try {
    sgMail.setApiKey(env.SENDGRID_API_KEY)

    const msg: MailDataRequired = {
      to,
      from: {
        name: fromName,
        email: "WFCentral@wfchocolate.com",
      },
      cc,
      subject,
      html,
      attachments,
      trackingSettings: {
        clickTracking: {
          enable: false,
        },
      },
    }

    const result = sendMultiple ? await sgMail.sendMultiple(msg) : await sgMail.send(msg)

    return result
  } catch (error) {
    const sendGridErrors = (error as { response?: { body?: { errors?: unknown } } })?.response?.body?.errors

    Sentry.captureException(error, {
      tags: {
        email_provider: "sendgrid",
        email_type: emailType ?? "unknown",
      },
      extra: {
        sendGridErrors,
        recipientCount: to.length,
        subject,
      },
    })

    throw error
  }
}
