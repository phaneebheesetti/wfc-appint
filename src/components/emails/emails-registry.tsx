import type { ComponentType } from "react"

import { AnnouncementEmail } from "./announcement-email"
import { ContactOrganizationAdminEmail } from "./contact-organization-admin-email"
import { EmailChangeReportNotification } from "./email-change-report-notification"
import { EmailChangeNotificationEmail } from "./email-change-verification-email"
import { GuardianPermissionSlipSignatureEmail } from "./guardian-permission-slip-signature-email"
import { QRCodeEmail } from "./qrcode-email"
import { RequestChocolateEmail } from "./request-chocolate-email"
import { ShopOrderConfirmationEmail } from "./shop-order-confirmation-email"
import { ShopOrderDeliveredEmail } from "./shop-order-delivered-email"
import { ShopOrderFailedEmail } from "./shop-order-failed-email"
import { ShopOrderParentNotificationEmail } from "./shop-order-parent-notification-email"
import { SignedPermissionSlipEmail } from "./signed-permission-slip-email"
import { WelcomeEmail } from "./welcome-email"
import { WelcomeParentEmail } from "./welcome-parent-email"

export type EmailTemplateComponent = ComponentType<Record<string, unknown>> & {
  PreviewProps?: Record<string, unknown>
}

export interface EmailEntry {
  id: string
  name: string
  component: EmailTemplateComponent
}

const asEmailTemplate = <P,>(C: ComponentType<P>): EmailTemplateComponent => C as unknown as EmailTemplateComponent

export const EMAIL_TEMPLATES: EmailEntry[] = [
  { id: "announcement", name: "Announcement", component: asEmailTemplate(AnnouncementEmail) },
  {
    id: "contact-organization-admin",
    name: "Contact organization admin",
    component: asEmailTemplate(ContactOrganizationAdminEmail),
  },
  {
    id: "guardian-permission-slip-signature",
    name: "Guardian permission slip signature",
    component: asEmailTemplate(GuardianPermissionSlipSignatureEmail),
  },
  { id: "qrcode", name: "QR code", component: asEmailTemplate(QRCodeEmail) },
  { id: "request-chocolate", name: "Request chocolate", component: asEmailTemplate(RequestChocolateEmail) },
  { id: "welcome", name: "Welcome", component: asEmailTemplate(WelcomeEmail) },
  { id: "welcome-parent", name: "Welcome parent", component: asEmailTemplate(WelcomeParentEmail) },
  {
    id: "signed-permission-slip",
    name: "Signed permission slip",
    component: asEmailTemplate(SignedPermissionSlipEmail),
  },
  {
    id: "email-change-notification",
    name: "Email Change Notification",
    component: asEmailTemplate(EmailChangeNotificationEmail),
  },
  {
    id: "email-change-report-notification",
    name: "Email Change Report Notification",
    component: asEmailTemplate(EmailChangeReportNotification),
  },
  {
    id: "shop-order-confirmation-email",
    name: "Digital Sales Order Confirmation Email",
    component: asEmailTemplate(ShopOrderConfirmationEmail),
  },
  {
    id: "shop-order-delivered-email",
    name: "Digital Sales Order Delivered Email",
    component: asEmailTemplate(ShopOrderDeliveredEmail),
  },
  {
    id: "shop-order-failed-email",
    name: "Digital Sales Order Failed Email",
    component: asEmailTemplate(ShopOrderFailedEmail),
  },
  {
    id: "shop-order-parent-notification-email",
    name: "Digital Sales Parent New Order Notification",
    component: asEmailTemplate(ShopOrderParentNotificationEmail),
  },
].sort((a, b) => a.name.localeCompare(b.name))
