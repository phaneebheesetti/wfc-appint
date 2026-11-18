import { Row, Section, Text } from "@react-email/components"

import { formatPackageLabel } from "@/components/campaigns/campaign-dashboard/digital-sales/format-package-label"
import { EmailLayout } from "@/components/emails/email-layout"
import { WFC_LONG_NAME } from "@/constants/app"

export interface ShopOrderConfirmationEmailProps {
  buyerName?: string
  participantName: string
  itemName: string
  quantityLabel: string
  formattedPrice: string
  totalLabel: string
  formattedTotal: string
  fulfillmentMethod: string
  fulfillmentNote: string
  address?: string
  specialRequest?: string
  campaignName: string
  organizationName: string
  supportEmail?: string
}

export function ShopOrderConfirmationEmail({
  buyerName,
  participantName,
  itemName,
  quantityLabel,
  formattedPrice,
  totalLabel,
  formattedTotal,
  fulfillmentMethod,
  fulfillmentNote,
  address,
  specialRequest,
  campaignName,
  organizationName,
  supportEmail,
}: ShopOrderConfirmationEmailProps) {
  const supportsLabel = organizationName ? `${campaignName} from ${organizationName}` : campaignName

  const greeting = buyerName ? `Hi ${buyerName},` : "Hi,"

  const thanksLine = participantName
    ? `Thanks for your order on ${participantName}'s Fundraiser!`
    : "Thanks for your order!"

  return (
    <EmailLayout title="Your order is confirmed!" preview="Thanks for your order! Here's your receipt.">
      <Section className="my-10">
        <Row>
          <Text>{greeting}</Text>
          <Text>{thanksLine} Here&apos;s your receipt.</Text>
        </Row>

        <Row>
          <Text className="text-xs font-bold uppercase tracking-wide">Your order</Text>
        </Row>

        <Row>
          <Text className="my-0">
            {formatPackageLabel(itemName, Number.parseInt(quantityLabel, 10))} — {formattedPrice}
          </Text>
        </Row>

        <Row>
          <Text className="my-0">
            {totalLabel}: {formattedTotal}
          </Text>
        </Row>

        <Row>
          <Text className="text-xs font-bold uppercase tracking-wide">Fulfillment</Text>
        </Row>

        <Row>
          <Text className="my-0">{fulfillmentMethod}</Text>
        </Row>

        <Row>
          <Text className="mt-0">{fulfillmentNote}</Text>
        </Row>

        {!!address?.trim() && (
          <>
            <Row>
              <Text className="text-xs font-bold uppercase tracking-wide">Address</Text>
            </Row>

            <Row>
              <Text className="mt-0">{address}</Text>
            </Row>
          </>
        )}

        {!!specialRequest?.trim() && (
          <>
            <Row>
              <Text className="text-xs font-bold uppercase tracking-wide">Special Request</Text>
            </Row>

            <Row>
              <Text className="mt-0">{specialRequest}</Text>
            </Row>
          </>
        )}

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

export default ShopOrderConfirmationEmail

ShopOrderConfirmationEmail.PreviewProps = {
  buyerName: "{buyerName}",
  participantName: "{participantName}",
  itemName: "{itemName}",
  quantityLabel: "{quantityLabel}",
  formattedPrice: "{formattedPrice}",
  totalLabel: "{totalLabel}",
  formattedTotal: "{formattedTotal}",
  fulfillmentMethod: "{fulfillmentMethod}",
  fulfillmentNote: "{fulfillmentNote}",
  address: "{address}",
  specialRequest: "{specialRequest}",
  campaignName: "{campaignName}",
  organizationName: "{organizationName}",
  supportEmail: "{supportEmail}",
} satisfies ShopOrderConfirmationEmailProps
