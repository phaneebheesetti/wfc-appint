/**
 * Lifecycle events that trigger a participant-name-access notification email. Each event emails
 * BOTH the campaign's Fundraising Consultant (FC) and every Organization Admin of the organization
 * that owns the fundraiser.
 */
export enum ParticipantAccessNotificationEvent {
  // Initial 4-week grant (first-ever cycle for this campaign + FC).
  GRANTED = "granted",
  // New 2-week cycle started after a WFC reset.
  REENABLED = "reenabled",
  // 2-week extension appended to an active cycle (approval 2 or 3 of 3).
  EXTENDED = "extended",
  // Access ended before expiry — manual OA revoke or a cascade (FC reassigned / fundraiser closed / deleted).
  REVOKED = "revoked",
  // Access window lapsed (stamped EXPIRED by the daily scheduler).
  EXPIRED = "expired",
  // Approaching expiry reminder (3 days before a 4-week window, 2 days before a 2-week window).
  EXPIRING_SOON = "expiring_soon",
}

// Who the email is addressed to. Copy differs slightly between the two.
export type ParticipantAccessRecipientRole = "FC" | "ORG_ADMIN"
