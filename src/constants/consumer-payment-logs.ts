export const ANONYMOUS_BUYER_NAME = "Friend"

export const normalizeBuyerName = (name?: string | null): string | null => {
  const trimmed = name?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

export const DELIVERY_NOTIFICATION_MAX_LENGTH = 1000

export const formatDeliveryNotification = (buyerName?: string | null, participantFirstName?: string | null): string => {
  const buyerFirstName = normalizeBuyerName(buyerName)?.split(" ")[0] ?? ANONYMOUS_BUYER_NAME
  const participant = normalizeBuyerName(participantFirstName) ?? "Your participant"

  return `Great news, ${buyerFirstName}! ${participant} has your chocolate ready and will deliver soon. Thank you for supporting their fundraiser!`
}

export enum PaymentMethodEnum {
  CASH = "CASH",
  CARD = "CARD",
}

export enum PaymentStatusEnum {
  PENDING = "PENDING", //for cash pending orders
  PAID = "PAID", //for paid cash and card orders
  FAILED = "FAILED", //for failed card orders
  PROCESSING = "PROCESSING", //for card orders that are being processed on stripe payment page
}

export enum OrderStatusEnum {
  NOT_DELIVERED = "NOT_DELIVERED",
  REQUESTED = "REQUESTED",
  DELIVERED = "DELIVERED",
}

export enum PreferredContactMethodEnum {
  PHONE = "PHONE",
  EMAIL = "EMAIL",
}

export type ConsumerOrderDetails = {
  name: string
  address: string
  phoneNumber: string
  preferredContactMethod: PreferredContactMethodEnum
  preferences: string
  packageLabel: string
  packageKey?: string
  pollingTimedOutAt?: string
}
