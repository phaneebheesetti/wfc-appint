import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { CtaButton } from "@/components/emails/email-layout/cta-button"
import { APP_NAME, WFC_LONG_NAME } from "@/constants/app"

export function WelcomeEmail() {
  return (
    <EmailLayout title={`You now have access to the fundraising app.`} preview={`You're In! Welcome to ${APP_NAME}!`}>
      <Section className="my-10">
        <Row>
          <Text>Hello,</Text>
          <Text>
            Welcome aboard—and congratulations on activating your account! 🎉 We&apos;re so glad you&apos;re here.
          </Text>
          <Text>
            You now have access to the new {WFC_LONG_NAME} fundraising app, {APP_NAME}, built to help you manage your
            fundraiser with ease. From tracking sales and collecting payments to managing prizes and communicating with
            parents, everything you need is right at your fingertips.
          </Text>
          <Text>
            <strong>Pro tip:</strong> Bookmark the app in your browser so you can jump back in anytime—quick access
            makes staying on top of your fundraiser even easier.
          </Text>
          <Text>
            As a reminder, this app is still evolving, and your use helps us continue improving it as we gear up for a
            full launch later this year. Thank you for being part of that process and for the incredible impact you make
            through fundraising.
          </Text>
          <CtaButton text="👉 Open the App & Get Started" />
          <Text>
            We&apos;re excited to build this future together and can&apos;t wait to see your fundraising progress grow.
          </Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default WelcomeEmail

WelcomeEmail.PreviewProps = {} satisfies Record<string, never>
