import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { WFC_LONG_NAME } from "@/constants/app"

export interface ShopOrderDeliveredEmailProps {
  message: string
}

export function ShopOrderDeliveredEmail({ message }: ShopOrderDeliveredEmailProps) {
  return (
    <EmailLayout title="Your order has been delivered!" preview={message}>
      <Section className="my-10">
        <Row>
          <Text>{message}</Text>
        </Row>

        <Row>
          <Text className="mt-0 italic">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default ShopOrderDeliveredEmail

ShopOrderDeliveredEmail.PreviewProps = {
  message: "{message}",
} satisfies ShopOrderDeliveredEmailProps
