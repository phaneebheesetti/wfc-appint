import type { PaymentIntent as StripePaymentIntent } from "@stripe/stripe-js"

export type PaymentIntent = StripePaymentIntent & {
  application_fee_amount: number
}
