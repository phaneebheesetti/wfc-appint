import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { WFC_LONG_NAME } from "@/constants/app"

export interface SignedPermissionSlipEmailProps {
  fundraisingManagerName: string
}

export function SignedPermissionSlipEmail(props: SignedPermissionSlipEmailProps) {
  const { fundraisingManagerName } = props

  return (
    <EmailLayout
      title={`Log into the app and track progress on parent permission slips.`}
      preview={`Another participant is ready to participate!`}
    >
      <Section className="my-10">
        <Row>
          <Text>Hello {fundraisingManagerName},</Text>
          <Text>
            Good news—a <strong>permission slip has been signed</strong>. You are one step closer to reaching your
            fundraising goals!
          </Text>
        </Row>
      </Section>

      <Section className="my-4">
        <Row>
          <Text>
            Approving requests promptly helps students stay motivated and keeps your fundraiser running smoothly.
          </Text>
          <Text>Thank you!</Text>
          <Text className="mt-0">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default SignedPermissionSlipEmail

SignedPermissionSlipEmail.PreviewProps = {
  fundraisingManagerName: "{fundraisingManagerName}",
} satisfies SignedPermissionSlipEmailProps
