import { Row, Section, Text } from "@react-email/components"

import { CtaButton, EmailLayout } from "@/components/emails/email-layout"
import { env } from "@/env"

export interface EmailChangeNotificationEmailProps {
  token: string
  reportToken: string //report token
}
export function EmailChangeNotificationEmail(props: EmailChangeNotificationEmailProps) {
  const { token, reportToken } = props

  return (
    <EmailLayout title={`Confirm Your Email Address Update`} preview={`Confirm Your Email Address Update`}>
      <Section className="my-10">
        <Row>
          <Text>We received a request to update the email address associated with your account.</Text>
          <Text>If you made this request, please confirm your new email address to complete the update.</Text>
          <Text>Until verification is complete, you can continue using your current email address to log in.</Text>

          <CtaButton href={token ?? env.NEXT_PUBLIC_APP_URL} text="Confirm Email Update" />
          <CtaButton href={reportToken ?? env.NEXT_PUBLIC_APP_URL} text="Report Unauthorized Change" />

          <Text>
            If you did not request this change, please report it immediately using the button above. Our team will
            review and secure your account.
          </Text>
          <Text>For your security, this link will expire in 24 hours.</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default EmailChangeNotificationEmail

EmailChangeNotificationEmail.PreviewProps = {} satisfies Record<string, never>
