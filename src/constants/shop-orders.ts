import { CircleDollarSign, CreditCard, type LucideIcon, Mail, Phone } from "lucide-react"

export enum ShopOrdersContactMethodEnum {
  EMAIL = "email",
  PHONE = "phone",
}

export enum ShopOrderPageEnum {
  ORDER_FORM = "order form",
  SUMMARY = "summary",
}

export enum ShopOrdersPaymentTypeEnum {
  CARD = "card",
  CASH = "cash",
}

export enum ShopOrdersStatusEnum {
  CONTACT_SUBMITTED = "contact_submitted",
  PAYMENT_PENDING = "payment_pending",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export const SHOP_ORDERS_CONTACT_METHOD_DETAILS: Record<
  ShopOrdersContactMethodEnum,
  { label: string; icon: LucideIcon }
> = {
  [ShopOrdersContactMethodEnum.EMAIL]: {
    label: "Email",
    icon: Mail,
  },
  [ShopOrdersContactMethodEnum.PHONE]: {
    label: "Phone",
    icon: Phone,
  },
}

export const SHOP_ORDERS_PAYMENT_TYPE_DETAILS: Record<
  ShopOrdersPaymentTypeEnum,
  {
    label: string
    icon: LucideIcon
    helperText: string
    noteText: string
    totalLabel: string
    fulfillmentMethod: string
    fulfillmentNote: string
  }
> = {
  [ShopOrdersPaymentTypeEnum.CARD]: {
    label: "Card",
    icon: CreditCard,
    helperText: "",
    noteText: "You'll complete payment through the secure WFCentral Payment Portal.",
    totalLabel: "Total paid",
    fulfillmentMethod: "In-person delivery",
    fulfillmentNote: "We'll reach out to arrange delivery.",
  },
  [ShopOrdersPaymentTypeEnum.CASH]: {
    label: "Cash",
    icon: CircleDollarSign,
    helperText:
      "Pay in cash upon delivery — no online payment needed. The order will show as awaiting cash payment until it's confirmed received.",
    noteText: "You'll pay in cash upon delivery. No online payment is required.",
    totalLabel: "Total due",
    fulfillmentMethod: "In-person delivery",
    fulfillmentNote: "Have cash ready — the order will be marked paid once it's collected.",
  },
}
