import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"

export interface EmailChangeReportNotificationProps {
  fullName: string
  role: string
  oldEmail: string
  newEmail: string
  reportedAt: string
  organization: string
}

export function EmailChangeReportNotification({
  fullName,
  role,
  oldEmail,
  newEmail,
  reportedAt,
  organization,
}: EmailChangeReportNotificationProps) {
  return (
    <EmailLayout title="Unauthorized Email Change Reported" preview="Unauthorized Email Change Reported">
      <Section className="my-10">
        <Row>
          <Text>
            An email change request has been reported as unauthorized by a user. The system has automatically reverted
            the email to the previous address.
          </Text>

          <Text>Please review the details below and take any necessary action.</Text>

          <Text>
            <strong>User Details:</strong>
          </Text>
          <Text>User Name: {fullName}</Text>
          <Text>Role: {role}</Text>
          <Text>Organization: {organization}</Text>

          <Text>
            <strong>Email Change Details:</strong>
          </Text>
          <Text>Previous Email (Active): {oldEmail}</Text>
          <Text>New Email Entered: {newEmail}</Text>

          <Text>
            <strong>Event Details:</strong>
          </Text>
          <Text>Reported At: {reportedAt}</Text>
          <Text>Reported By: User via email verification flow</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default EmailChangeReportNotification
