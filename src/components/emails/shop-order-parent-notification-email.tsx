import { Row, Section, Text } from "@react-email/components"

import { formatPackageLabel } from "@/components/campaigns/campaign-dashboard/digital-sales/format-package-label"
import { EmailLayout } from "@/components/emails/email-layout"
import { WFC_LONG_NAME } from "@/constants/app"

export interface ShopOrderParentNotificationEmailProps {
  participantFullName: string
  organizationName: string
  campaignName: string
  wfcentralUrl: string
  buyerName: string
  phoneNumber: string
  buyerEmail: string
  preferredContactMethodLabel: string
  address: string
  itemName: string
  barsQuantity: number
  paymentStatusLabel: string
  formattedAmount: string
  specialRequest: string
}

const DASH = "-"

export function ShopOrderParentNotificationEmail({
  participantFullName,
  organizationName,
  campaignName,
  wfcentralUrl,
  buyerName,
  phoneNumber,
  buyerEmail,
  preferredContactMethodLabel,
  address,
  itemName,
  barsQuantity,
  paymentStatusLabel,
  formattedAmount,
  specialRequest,
}: ShopOrderParentNotificationEmailProps) {
  const subjectLine = `New Online Order for ${participantFullName} - ${organizationName} - ${campaignName}`
  const itemsOrdered = formatPackageLabel(itemName, barsQuantity)

  return (
    <EmailLayout title={subjectLine} preview="You have a new order.">
      <Section className="my-10">
        <Row>
          <Text>
            You have a new order. Please log into the Fundraising Parent Hub (<a href={wfcentralUrl}>WFCentral</a>) for
            more details and to manage delivery.
          </Text>
        </Row>

        <Row>
          <Text className="text-xs font-bold uppercase tracking-wide">
            Order Details for {participantFullName} - {organizationName} - {campaignName}
          </Text>
        </Row>

        <Row>
          <Text className="my-0">
            Name: {buyerName || DASH}
            <br />
            Phone Number: {phoneNumber || DASH}
            <br />
            Email: {buyerEmail || DASH}
            <br />
            Preferred contact method: {preferredContactMethodLabel || DASH}
            <br />
            Address: {address || DASH}
            <br />
            Item(s) Ordered: {itemsOrdered}
            <br />
            Payment status: {paymentStatusLabel}
            <br />
            Amount: {formattedAmount}
            <br />
            Special Request: {specialRequest || DASH}
          </Text>
        </Row>

        <Row>
          <Text>
            If you have questions about the fundraiser itself, please contact your Fundraising Manager, who will be
            happy to help.
          </Text>

          <Text>
            Thank you for supporting your student and helping make this fundraiser a success. We truly appreciate your
            partnership!
          </Text>

          <Text className="mt-0 italic">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default ShopOrderParentNotificationEmail

ShopOrderParentNotificationEmail.PreviewProps = {
  participantFullName: "{participantFullName}",
  organizationName: "{organizationName}",
  campaignName: "{campaignName}",
  wfcentralUrl: "{wfcentralUrl}",
  buyerName: "{buyerName}",
  phoneNumber: "{phoneNumber}",
  buyerEmail: "{buyerEmail}",
  preferredContactMethodLabel: "{preferredContactMethodLabel}",
  address: "{address}",
  itemName: "{itemName}",
  barsQuantity: 1,
  paymentStatusLabel: "{paymentStatusLabel}",
  formattedAmount: "{formattedAmount}",
  specialRequest: "{specialRequest}",
} satisfies ShopOrderParentNotificationEmailProps
