import { Hr, Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { env } from "@/env"

export interface AnnouncementEmailProps {
  content: string
  title: string
  organizationName: string
  campaignName: string
  includeLinkToApp?: boolean
}

export function AnnouncementEmail(props: AnnouncementEmailProps) {
  const { content, title, organizationName, campaignName, includeLinkToApp } = props

  return (
    <EmailLayout
      title={`Fundraising Update from ${organizationName} 📢`}
      preview="Your fundraising manager has sent an important message."
      includeLinkToApp={includeLinkToApp}
      ctaText="Reply"
      ctaHref={`${env.NEXT_PUBLIC_APP_URL}/dashboard/chat`}
      noReplyText={
        includeLinkToApp
          ? "Please do not reply directly to this e-mail. Use the “Reply” button above to respond"
          : "Please do not reply directly to this e-mail."
      }
    >
      <Section className="my-10">
        <Row>
          <Text className="text-center">
            There&apos;s a new update from your fundraising manager regarding {campaignName}&apos;s fundraiser.
          </Text>
        </Row>
        <Hr />
        <Row>
          <Text className="text-center font-medium text-2xl leading-4">{title}</Text>
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </Row>
        <Hr />
      </Section>
    </EmailLayout>
  )
}

export default AnnouncementEmail

AnnouncementEmail.PreviewProps = {
  content: "{content}",
  title: "{title}",
  includeLinkToApp: true,
  organizationName: "{organizationName}",
  campaignName: "{campaignName}",
} satisfies AnnouncementEmailProps
