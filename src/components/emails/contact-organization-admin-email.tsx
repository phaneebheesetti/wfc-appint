import { Hr, Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"

export interface ContactOrganizationAdminEmailProps {
  parentName: string
  parentEmail: string
  parentPhone: string | null
  childrenAttempted: Array<{ firstName: string; lastName: string; grade: string }>
  message: string
}

export function ContactOrganizationAdminEmail(props: ContactOrganizationAdminEmailProps) {
  const { parentName, parentEmail, parentPhone, childrenAttempted, message } = props

  return (
    <EmailLayout
      title="Parent Needs Assistance 🆘"
      preview={`${parentName} is having trouble finding their children during Sign Up`}
    >
      <Section className="my-10">
        <Row>
          <Text className="text-center">
            A parent is having trouble finding their children during the Sign Up process and has requested assistance.
          </Text>
        </Row>
        <Hr />
        <Row>
          <Text className="text-center text-lg font-semibold mb-0">Parent Information</Text>
          <Text className="text-center text-sm text-gray-500 my-0">
            {parentName} - {parentEmail} {parentPhone ? `- ${parentPhone}` : ""}
          </Text>
        </Row>
        <Hr />
        {childrenAttempted?.length > 0 && (
          <>
            <Row>
              <Text className="text-center text-lg font-semibold mb-0">Children They Tried to Find</Text>
              {childrenAttempted.map((child, index) => (
                <Text
                  key={index}
                  className={`text-center text-sm text-gray-500 ${index === childrenAttempted?.length - 1 ? "mt-0" : "my-0"}`}
                >
                  {child.firstName} {child.lastName} - {child.grade}
                </Text>
              ))}
            </Row>
            <Hr />
          </>
        )}
        <Row>
          <Text className="text-center text-lg font-semibold mb-0">Message from Parent</Text>
          <Text className="text-center text-sm text-gray-600 my-2">&quot;{message}&quot;</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default ContactOrganizationAdminEmail

ContactOrganizationAdminEmail.PreviewProps = {
  parentName: "{parentName}",
  parentEmail: "{parentEmail}",
  parentPhone: "{parentPhone}",
  childrenAttempted: [{ firstName: "{firstName}", lastName: "{lastName}", grade: "{grade}" }],
  message: "{message}",
} satisfies ContactOrganizationAdminEmailProps
