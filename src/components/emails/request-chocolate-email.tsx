import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { CtaButton } from "@/components/emails/email-layout/cta-button"
import { WFC_LONG_NAME } from "@/constants/app"

export interface RequestChocolateEmailProps {
  fundraisingManagerName: string
}

export function RequestChocolateEmail({ fundraisingManagerName }: RequestChocolateEmailProps) {
  return (
    <EmailLayout
      title="Your fundraiser requires approval to release more chocolate."
      preview="Request for more chocolate"
    >
      <Section className="my-10">
        <Row>
          <Text>Hello {fundraisingManagerName},</Text>
          <Text>
            Good news—one of your participants is on a roll! 🎉 A request for <strong>additional chocolate</strong> has
            been submitted. To keep sales moving, this request needs your approval in WFCentral.
          </Text>
        </Row>
      </Section>

      <CtaButton text="👉 Review & Approve Request" />

      <Section className="my-4">
        <Row>
          <Text>
            Approving requests promptly helps students stay motivated and keeps your fundraiser running smoothly.
          </Text>
          <Text>You&apos;ve Got This!</Text>
          <Text className="mt-0">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default RequestChocolateEmail

RequestChocolateEmail.PreviewProps = {
  fundraisingManagerName: "{fundraisingManagerName}",
} satisfies RequestChocolateEmailProps
