import { render } from "@react-email/components"
import * as Sentry from "@sentry/nextjs"
import { and, eq, isNull } from "drizzle-orm"

import { ParticipantAccessEmail } from "@/components/emails/participant-access-email"
import { type FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import {
  ParticipantAccessNotificationEvent,
  type ParticipantAccessRecipientRole,
} from "@/constants/participant-access-notifications"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import type { db } from "@/server/db"
import { campaigns, organizationsUsers, users } from "@/server/db/schema"
import { sendEmail } from "@/server/services/email-messaging"

const SUBJECTS: Record<ParticipantAccessNotificationEvent, (campaignName: string) => string> = {
  [ParticipantAccessNotificationEvent.GRANTED]: name => `Participant name access granted — ${name}`,
  [ParticipantAccessNotificationEvent.REENABLED]: name => `Participant name access re-enabled — ${name}`,
  [ParticipantAccessNotificationEvent.EXTENDED]: name => `Participant name access extended — ${name}`,
  [ParticipantAccessNotificationEvent.EXPIRING_SOON]: name => `Participant name access expiring soon — ${name}`,
  [ParticipantAccessNotificationEvent.EXPIRED]: name => `Participant name access expired — ${name}`,
  [ParticipantAccessNotificationEvent.REVOKED]: name => `Participant name access revoked — ${name}`,
}

const fullName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName].filter(Boolean).join(" ").trim() || null

export const participantNamesAccessNotify = async ({
  database,
  campaignId,
  fundraiserUserId,
  event,
  expiryDate,
  approvalNumber,
  durationWeeks,
  reason,
}: {
  database: typeof db
  campaignId: string
  // The FC whose access this notification concerns (the outgoing FC for a reassignment cascade).
  fundraiserUserId: string
  event: ParticipantAccessNotificationEvent
  expiryDate?: string | null
  approvalNumber?: number | null
  durationWeeks?: number | null
  reason?: FcAccessRevocationReasonEnum | null
}) => {
  try {
    const campaign = await database.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
      columns: { id: true, name: true, organizationId: true },
    })

    if (!campaign) return

    // Only an active, non-deleted FC is emailed about their access.
    const fc = await database.query.users.findFirst({
      where: and(eq(users.id, fundraiserUserId), eq(users.status, UsersStatusEnum.ACTIVE), isNull(users.deletedAt)),
      columns: { email: true, firstName: true, lastName: true },
    })

    // Every active Organization Admin of the org that owns this fundraiser. They manage
    // participant-name access, so they receive the same lifecycle notifications as the FC (and the
    // approaching-expiry reminder goes to them alone). Only active, non-deleted admins are emailed.
    const orgAdmins = await database
      .select({ email: users.email, firstName: users.firstName })
      .from(organizationsUsers)
      .innerJoin(users, eq(organizationsUsers.userId, users.id))
      .where(
        and(
          eq(organizationsUsers.organizationId, campaign.organizationId),
          eq(users.role, RolesEnum.ORGANIZATION_ADMIN),
          eq(users.status, UsersStatusEnum.ACTIVE),
          isNull(users.deletedAt)
        )
      )

    const fcName = fullName(fc?.firstName, fc?.lastName)
    const campaignName = campaign.name ?? "your fundraiser"

    const recipients: {
      role: ParticipantAccessRecipientRole
      email: string | null | undefined
      name: string | null | undefined
    }[] = [
      { role: "FC", email: fc?.email, name: fc?.firstName },
      ...orgAdmins.map(admin => ({
        role: "ORG_ADMIN" as ParticipantAccessRecipientRole,
        email: admin.email,
        name: admin.firstName,
      })),
    ]

    // The approaching-expiry reminder goes to the Organization Admins only (they own the decision to
    // extend); every other lifecycle event notifies both the FC and the Organization Admins.
    const notifiedRoles: ParticipantAccessRecipientRole[] =
      event === ParticipantAccessNotificationEvent.EXPIRING_SOON ? ["ORG_ADMIN"] : ["FC", "ORG_ADMIN"]

    const subject = SUBJECTS[event](campaignName)

    // Dedupe by email so a person who is both the FC and an admin of this org isn't emailed twice.
    const seenEmails = new Set<string>()

    await Promise.allSettled(
      recipients
        .filter(recipient => {
          if (!notifiedRoles.includes(recipient.role) || !recipient.email) return false
          const email = recipient.email.toLowerCase()
          if (seenEmails.has(email)) return false
          seenEmails.add(email)
          return true
        })
        .map(async recipient => {
          const html = await render(
            <ParticipantAccessEmail
              event={event}
              recipientRole={recipient.role}
              recipientName={recipient.name}
              campaignName={campaignName}
              fcName={fcName}
              expiryDate={expiryDate}
              approvalNumber={approvalNumber}
              durationWeeks={durationWeeks}
              reason={reason}
            />
          )

          return sendEmail({ to: [recipient.email!], subject, html })
        })
    )
  } catch (error) {
    // Never let a notification failure break the access operation that triggered it.
    Sentry.captureException(error)
  }
}
