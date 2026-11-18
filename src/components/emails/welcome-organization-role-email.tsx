import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { APP_NAME, WFC_LONG_NAME } from "@/constants/app"
import { env } from "@/env"

import { CtaButton } from "./email-layout/cta-button"

export interface WelcomeOrganizationRoleEmailProps {
  signInLink: string
}

export function WelcomeOrganizationRoleEmail(props: WelcomeOrganizationRoleEmailProps) {
  const { signInLink } = props

  return (
    <EmailLayout
      title={`You've been added to ${APP_NAME}`}
      preview="Complete your account setup to start managing your fundraiser."
    >
      <Section className="my-10">
        <Row>
          <Text>Hi there,</Text>
          <Text>
            You&apos;ve been added as a user in {APP_NAME}, the {WFC_LONG_NAME} fundraising app.
          </Text>
          <Text>
            {APP_NAME} helps make fundraising easier by keeping important fundraiser details in one place — including
            progress tracking, participants, inventory, payments, permission slips, and family communications.
          </Text>
          <Text>
            To get started, please log in and complete your account setup. Once your account is active, you&apos;ll be
            able to start using the app to help manage your fundraiser.
          </Text>
        </Row>

        <CtaButton href={signInLink ?? env.NEXT_PUBLIC_APP_URL} text="Complete Account Setup" />
      </Section>
    </EmailLayout>
  )
}

export default WelcomeOrganizationRoleEmail

WelcomeOrganizationRoleEmail.PreviewProps = {
  signInLink: "{signInLink}",
} satisfies WelcomeOrganizationRoleEmailProps
