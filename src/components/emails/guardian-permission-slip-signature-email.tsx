import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { CtaButton } from "@/components/emails/email-layout/cta-button"
import { WFC_LONG_NAME } from "@/constants/app"
import { env } from "@/env"

export interface GuardianPermissionSlipSignatureEmailProps {
  organizationName: string
}

export function GuardianPermissionSlipSignatureEmail({ organizationName }: GuardianPermissionSlipSignatureEmailProps) {
  const titlePreview = `Permission Needed for Upcoming ${organizationName} Fundraiser`

  return (
    <EmailLayout title={titlePreview} preview={titlePreview}>
      <Section className="my-10">
        <Row>
          <Text>Hello,</Text>
          <Text>
            We&apos;re reaching out to let you know that your child has been added as a participant in an upcoming{" "}
            {WFC_LONG_NAME} fundraiser supporting <strong>{organizationName}</strong>.
          </Text>
          <Text>
            To take part, a <strong>parent or guardian permission slip is required</strong>. This helps ensure everyone
            has the information they need and that participation is approved before fundraising begins.
          </Text>
          <Text>
            The fundraiser will give students the opportunity to support their organization while building skills and
            earning fun prizes along the way.
          </Text>
        </Row>
      </Section>

      <CtaButton href={`${env.NEXT_PUBLIC_APP_URL}/dashboard/documents`} text="👉 Review & Sign the Permission Slip" />

      <Section className="my-4">
        <Row>
          <Text>
            Once the permission slip is signed, your child will be officially ready to participate. If you have any
            questions, you can reach out to your fundraiser organizer directly.
          </Text>
          <Text>Thank you for your support and for helping make this fundraiser a success!</Text>
          <Text className="mt-0">{WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default GuardianPermissionSlipSignatureEmail

GuardianPermissionSlipSignatureEmail.PreviewProps = {
  organizationName: "{organizationName}",
} satisfies GuardianPermissionSlipSignatureEmailProps
