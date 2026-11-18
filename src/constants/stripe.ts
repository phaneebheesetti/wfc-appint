export enum MCCEnum {
  // Educational
  ELEMENTARY_SECONDARY_SCHOOLS = "8211",
  COLLEGES_UNIVERSITIES = "8220",
  EDUCATIONAL_SERVICES = "8299",
  VOCATIONAL_TRADE_SCHOOLS = "8249",

  // Charitable & Social
  CHARITABLE_SOCIAL_SERVICE_ORGANIZATIONS = "8398",

  // Religious & Community
  RELIGIOUS_ORGANIZATIONS = "8661",
  CIVIC_SOCIAL_FRATERNAL_ASSOCIATIONS = "8641",

  // Sports & Recreation
  SPORTING_RECREATION_CAMPS = "7032",
  SPORTS_CLUBS_FIELDS = "7941",

  // Other
  MEMBERSHIP_ORGANIZATIONS = "8699",
  DEFAULT = "default",
}

export enum PaymentMethodsEnum {
  CARD = "card",
  US_BANK_ACCOUNT = "us_bank_account",
  DEFAULT = "default",
}

interface PaymentApplicationFee {
  variable: number // percentage
  fixed: number // cents
  maximum?: number // cents
}

const paymentApplicationFeeByPaymentMethod: Record<PaymentMethodsEnum, PaymentApplicationFee> = {
  // 0.35% + $0.01 USD
  [PaymentMethodsEnum.CARD]: {
    variable: 0.35,
    fixed: 1,
  },
  // 0.8%, maximum $5.00 USD
  [PaymentMethodsEnum.US_BANK_ACCOUNT]: {
    variable: 0.8,
    fixed: 0,
    maximum: 500,
  },
  // 1%, maximum $1.00 USD
  [PaymentMethodsEnum.DEFAULT]: {
    variable: 1,
    fixed: 0,
    maximum: 100,
  },
}

const cardPaymentNetworkFeeByMCC: Record<MCCEnum, PaymentApplicationFee> = {
  [MCCEnum.ELEMENTARY_SECONDARY_SCHOOLS]: {
    variable: 0.96,
    fixed: 11,
  },
  [MCCEnum.COLLEGES_UNIVERSITIES]: {
    variable: 0.96,
    fixed: 11,
  },
  [MCCEnum.EDUCATIONAL_SERVICES]: {
    variable: 0.96,
    fixed: 11,
  },
  [MCCEnum.VOCATIONAL_TRADE_SCHOOLS]: {
    variable: 0.96,
    fixed: 11,
  },
  [MCCEnum.CHARITABLE_SOCIAL_SERVICE_ORGANIZATIONS]: {
    variable: 1.09,
    fixed: 10,
  },
  [MCCEnum.RELIGIOUS_ORGANIZATIONS]: {
    variable: 1.09,
    fixed: 10,
  },
  [MCCEnum.CIVIC_SOCIAL_FRATERNAL_ASSOCIATIONS]: {
    variable: 1.0,
    fixed: 11,
  },
  [MCCEnum.SPORTING_RECREATION_CAMPS]: {
    variable: 1.15,
    fixed: 12,
  },
  [MCCEnum.SPORTS_CLUBS_FIELDS]: {
    variable: 1.15,
    fixed: 12,
  },
  [MCCEnum.MEMBERSHIP_ORGANIZATIONS]: {
    variable: 1.0,
    fixed: 11,
  },
  [MCCEnum.DEFAULT]: {
    variable: 1.4,
    fixed: 10,
  },
}

interface PaymentApplicationFeeParams {
  amountCents: number
  paymentMethod: PaymentMethodsEnum
  mcc: MCCEnum
}

export const getPaymentApplicationFeeAmount = ({
  amountCents,
  paymentMethod,
  mcc,
}: PaymentApplicationFeeParams): number => {
  if (paymentMethod === PaymentMethodsEnum.CARD) {
    return getCardPaymentApplicationFeeAmount({ amountCents, mcc })
  }

  const paymentApplicationFee =
    paymentApplicationFeeByPaymentMethod[paymentMethod] ?? paymentApplicationFeeByPaymentMethod.default

  const fee = amountCents * (paymentApplicationFee.variable / 100) + paymentApplicationFee.fixed

  if (paymentApplicationFee.maximum) {
    return Math.round(Math.min(fee, paymentApplicationFee.maximum))
  }

  return Math.round(fee)
}

interface CardPaymentApplicationFeeParams {
  amountCents: number
  mcc: MCCEnum
}

export const getCardPaymentApplicationFeeAmount = ({ amountCents, mcc }: CardPaymentApplicationFeeParams): number => {
  const applicationFee = paymentApplicationFeeByPaymentMethod.card
  const networkFee = cardPaymentNetworkFeeByMCC[mcc] ?? cardPaymentNetworkFeeByMCC[MCCEnum.DEFAULT]

  const totalAmount =
    (amountCents + applicationFee.fixed + networkFee.fixed) /
    (1 - (applicationFee.variable / 100 + networkFee.variable / 100))

  const fee = totalAmount - amountCents

  return Math.round(fee)
}
