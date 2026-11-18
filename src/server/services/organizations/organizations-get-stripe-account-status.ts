import { stripe } from "@/lib/stripe"

export const organizationsGetStripeAccountStatus = async ({ stripeAccountId }: { stripeAccountId: string }) => {
  const account = await stripe.accounts.retrieve(stripeAccountId)

  return {
    chargesEnabled: account.charges_enabled,
  }
}
