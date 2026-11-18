import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"

export function QRCodeEmail() {
  return (
    <EmailLayout
      title={`QR codes for your fundraiser 🖨`}
      preview="Check your attachment for the QR codes PDF to be printed 🖨"
      includeLinkToApp
    >
      <Section className="my-10">
        <Row>
          <Text className="text-center">
            The attached file contains the printable QR codes for all of your participants.
            <br />
            Each participant has a unique QR code, which makes accepting digital payments easy to do!
          </Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default QRCodeEmail

QRCodeEmail.PreviewProps = {} satisfies Record<string, never>
