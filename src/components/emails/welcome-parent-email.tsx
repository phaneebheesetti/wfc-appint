import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { APP_NAME, WFC_LONG_NAME } from "@/constants/app"
import { env } from "@/env"

import { CtaButton } from "./email-layout/cta-button"

export interface WelcomeParentEmailProps {
  signInLink: string
}

export function WelcomeParentEmail(props: WelcomeParentEmailProps) {
  const { signInLink } = props

  return (
    <EmailLayout
      title={`Your ${WFC_LONG_NAME} fundraiser is starting soon`}
      preview={`Your ${WFC_LONG_NAME} fundraiser is starting soon`}
    >
      <Section className="my-10">
        <Row>
          <Text>Hello,</Text>
          <Text>
            We&apos;re excited to let you know that your {WFC_LONG_NAME} fundraiser is starting soon! To help you stay
            informed and involved throughout your fundraiser, you&apos;ll have access to {APP_NAME} - a secure,
            easy-to-use portal designed to make managing your fundraiser simple and stress-free.
          </Text>
          <Text>
            <strong>What you can do in {APP_NAME}:</strong>
          </Text>
          <Text className="mb-6">
            • Confirm permission to participate, if required
            <br />
            • Track fundraiser progress
            <br />
            • Make and collect secure digital payments, if available
            <br />
            • View important updates and announcements
            <br />• Request additional chocolate as needed
          </Text>
        </Row>

        <CtaButton href={signInLink ?? env.NEXT_PUBLIC_APP_URL} text={"Complete setup for your participant"} />

        <Row>
          <Text>
            Once you&apos;re in, you&apos;ll be able to review details, give permission, and support your participant
            every step of the way.
          </Text>
          <Text>
            If you have questions about the fundraiser itself, please contact your Fundraising Manager, who will be
            happy to help.
          </Text>
          <Text>
            Thank you for supporting your participant and helping make this fundraiser a success. We truly appreciate
            your partnership!
          </Text>
          <Text className="mt-6 italic">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeParentEmail

WelcomeParentEmail.PreviewProps = {
  signInLink: "{signInLink}",
} satisfies WelcomeParentEmailProps
