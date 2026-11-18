import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { WFC_LONG_NAME } from "@/constants/app"

import { formatPackageLabel } from "../campaigns/campaign-dashboard/digital-sales/format-package-label"

export interface ShopOrderFailedEmailProps {
  buyerName?: string
  participantName: string
  itemName: string
  barsQuantity: number
  formattedTotal: string
  salesPageUrl: string
  campaignName: string
  organizationName: string
  supportEmail?: string
}

export function ShopOrderFailedEmail({
  buyerName,
  participantName,
  itemName,
  barsQuantity,
  formattedTotal,
  salesPageUrl,
  campaignName,
  organizationName,
  supportEmail,
}: ShopOrderFailedEmailProps) {
  const supportsLabel = organizationName ? `${campaignName} from ${organizationName}` : campaignName
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi,"
  const fundraiserLine = participantName
    ? `We ran into a problem processing your payment for your order on ${participantName}'s Fundraiser.`
    : "We ran into a problem processing your payment for your order."

  return (
    <EmailLayout title="There was a problem with your order" preview="Your payment couldn't be processed.">
      <Section className="my-10">
        <Row>
          <Text>{greeting}</Text>
          <Text>{fundraiserLine}</Text>
        </Row>

        <Row>
          <Text className="text-xs font-bold uppercase tracking-wide">Your order</Text>
        </Row>

        <Row>
          <Text className="my-0">
            {formatPackageLabel(itemName, barsQuantity)} — {formattedTotal}
          </Text>
        </Row>

        <Row>
          <Text className="my-0">Total due: {formattedTotal}</Text>
        </Row>

        <Row>
          <Text className="text-xs font-bold uppercase tracking-wide">Payment status</Text>
        </Row>

        <Row>
          <Text className="my-0">Payment failed</Text>
        </Row>

        <Row>
          <Text className="mt-0">Your payment couldn&apos;t be processed and no charge was made.</Text>
        </Row>

        <Row>
          <Text>
            To complete your order, please visit the <a href={salesPageUrl}>digital sales page</a> and try again.
          </Text>
        </Row>

        <Row>
          <Text>This order supports {supportsLabel}. Thank you for your support!</Text>

          {!!supportEmail && (
            <Text>If you have any questions about your order, please reach out to {supportEmail}.</Text>
          )}

          <Text className="mt-0 italic">The {WFC_LONG_NAME} Fundraising Team</Text>
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default ShopOrderFailedEmail

ShopOrderFailedEmail.PreviewProps = {
  buyerName: "{buyerName}",
  participantName: "{participantName}",
  itemName: "{itemName}",
  barsQuantity: 1,
  formattedTotal: "{formattedTotal}",
  salesPageUrl: "{salesPageUrl}",
  campaignName: "{campaignName}",
  organizationName: "{organizationName}",
  supportEmail: "{supportEmail}",
} satisfies ShopOrderFailedEmailProps
