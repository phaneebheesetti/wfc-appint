import { Row, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { type FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import {
  ParticipantAccessNotificationEvent as Event,
  type ParticipantAccessRecipientRole,
} from "@/constants/participant-access-notifications"
import { formatUtcDate } from "@/utils/date"

export interface ParticipantAccessEmailProps {
  event: Event
  recipientRole: ParticipantAccessRecipientRole
  recipientName?: string | null
  campaignName: string
  fcName?: string | null
  expiryDate?: string | null
  approvalNumber?: number | null
  durationWeeks?: number | null
  reason?: FcAccessRevocationReasonEnum | null
}

interface Copy {
  title: string
  preview: string
  paragraphs: string[]
}

// The FC is the person whose access is affected; the Organization Admin manages access and is kept informed.
function getCopy({
  event,
  recipientRole,
  recipientName,
  campaignName,
  fcName,
  expiryDate,
  approvalNumber,
  durationWeeks,
  reason,
}: ParticipantAccessEmailProps): Copy {
  const isFc = recipientRole === "FC"
  const who = isFc ? "your" : "your Fundraising Consultant's"
  const trimmedName = recipientName?.trim()
  const greetingName = trimmedName?.length ? trimmedName : "there"
  const expiry = expiryDate ? `${formatUtcDate(expiryDate)} (UTC)` : null
  const window = durationWeeks ? `${durationWeeks}-week` : null
  const trimmedFc = fcName?.trim()
  const fc = trimmedFc?.length ? trimmedFc : "the assigned Fundraising Consultant"

  switch (event) {
    case Event.GRANTED:
    case Event.REENABLED: {
      const reenabled = event === Event.REENABLED
      return {
        title: isFc ? "You now have access to participant names" : "Participant name access granted",
        preview: `Participant name access for ${campaignName}${expiry ? ` is active until ${expiry}` : ""}`,
        paragraphs: isFc
          ? [
              `Hello ${greetingName},`,
              `${reenabled ? "Access has been re-enabled" : "You have been granted access"} to participant information for the fundraiser "${campaignName}".`,
              expiry
                ? `This access is active now and will remain in effect until ${expiry}${window ? ` (a ${window} window)` : ""}. Access ends on that date.`
                : "This access is active now.",
              "You can view participant names across the fundraiser's reports and lists while access is active.",
            ]
          : [
              `Hello ${greetingName},`,
              `${reenabled ? "Participant name access has been re-enabled" : "Participant name access has been granted"} to ${fc} for your fundraiser "${campaignName}".`,
              expiry
                ? `The access is active now and will remain in effect until ${expiry}${window ? ` (a ${window} window)` : ""}.`
                : "The access is active now.",
            ],
      }
    }

    case Event.EXTENDED: {
      const approvalText = approvalNumber ? ` This is approval ${approvalNumber} of 3.` : ""
      return {
        title: isFc ? "Your participant name access was extended" : "Participant name access extended",
        preview: `Participant name access for ${campaignName}${expiry ? ` now runs until ${expiry}` : ""}`,
        paragraphs: isFc
          ? [
              `Hello ${greetingName},`,
              `${who.charAt(0).toUpperCase() + who.slice(1)} access to participant information for "${campaignName}" has been extended.`,
              expiry
                ? `It will now remain in effect until ${expiry}${window ? ` (a ${window} extension)` : ""}.${approvalText}`
                : `Access has been extended.${approvalText}`,
            ]
          : [
              `Hello ${greetingName},`,
              `Participant name access for ${fc} on your fundraiser "${campaignName}" has been extended.`,
              expiry
                ? `It will now remain in effect until ${expiry}${window ? ` (a ${window} extension)` : ""}.${approvalText}`
                : `Access has been extended.${approvalText}`,
            ],
      }
    }

    case Event.EXPIRING_SOON: {
      return {
        title: "Participant name access is expiring soon",
        preview: `Participant name access for ${campaignName}${expiry ? ` expires on ${expiry}` : " is expiring soon"}`,
        paragraphs: isFc
          ? [
              `Hello ${greetingName},`,
              `Your access to participant information for "${campaignName}" is approaching its expiry.`,
              expiry
                ? `It will expire on ${expiry}. To keep access beyond that date, the Organization Admin can extend it.`
                : "It will expire soon.",
            ]
          : [
              `Hello ${greetingName},`,
              `Participant name access for ${fc} on your fundraiser "${campaignName}" is approaching its expiry.`,
              expiry
                ? `It will expire on ${expiry}. You can extend the access from the fundraiser page if it is still needed.`
                : "It will expire soon.",
            ],
      }
    }

    case Event.EXPIRED: {
      return {
        title: isFc ? "Your participant name access has expired" : "Participant name access has expired",
        preview: `Participant name access for ${campaignName} has expired`,
        paragraphs: isFc
          ? [
              `Hello ${greetingName},`,
              expiry
                ? `Your access to participant information for "${campaignName}" expired on ${expiry}.`
                : `Your access to participant information for "${campaignName}" has expired.`,
              "Participant names are no longer visible to you for this fundraiser. To regain access, the Organization Admin can re-enable it.",
            ]
          : [
              `Hello ${greetingName},`,
              expiry
                ? `Participant name access for ${fc} on your fundraiser "${campaignName}" expired on ${expiry}.`
                : `Participant name access for ${fc} on your fundraiser "${campaignName}" has expired.`,
              "You can re-enable access from the fundraiser page if it is still needed.",
            ],
      }
    }

    case Event.REVOKED:
    default: {
      const because = reason ? ` (${reason})` : ""
      return {
        title: isFc ? "Your participant name access was revoked" : "Participant name access revoked",
        preview: `Participant name access for ${campaignName} has been revoked`,
        paragraphs: isFc
          ? [
              `Hello ${greetingName},`,
              `Your access to participant information for "${campaignName}" has been revoked${because}.`,
              "Participant names are no longer visible to you for this fundraiser.",
            ]
          : [
              `Hello ${greetingName},`,
              `Participant name access for ${fc} on your fundraiser "${campaignName}" has been revoked${because}.`,
            ],
      }
    }
  }
}

export function ParticipantAccessEmail(props: ParticipantAccessEmailProps) {
  const { title, preview, paragraphs } = getCopy(props)

  return (
    <EmailLayout title={title} preview={preview} includeLinkToApp>
      <Section className="my-10">
        <Row>
          {paragraphs.map((paragraph, index) => (
            <Text key={index}>{paragraph}</Text>
          ))}
        </Row>
      </Section>
    </EmailLayout>
  )
}

export default ParticipantAccessEmail

ParticipantAccessEmail.PreviewProps = {
  event: Event.GRANTED,
  recipientRole: "FC",
  recipientName: "Alex",
  campaignName: "Spring 2026 Chocolate Drive",
  fcName: "Jordan Lee",
  expiryDate: "2026-02-10T00:00:00.000Z",
  approvalNumber: 1,
  durationWeeks: 4,
  reason: null,
} satisfies ParticipantAccessEmailProps
