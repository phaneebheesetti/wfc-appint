"use client"

import { ConnectComponentsProvider } from "@stripe/react-connect-js"

import { useStripeConnect } from "@/hooks/use-stripe-connect"

interface StripeConnectProviderProps {
  stripeAccountId: string
  enablePayouts?: boolean
  children: React.ReactNode
}

export const StripeConnectProvider = ({
  stripeAccountId,
  enablePayouts = false,
  children,
}: StripeConnectProviderProps) => {
  const { stripeConnectInstance } = useStripeConnect({ stripeAccountId, enablePayouts })

  if (!stripeConnectInstance) {
    return null
  }

  return <ConnectComponentsProvider connectInstance={stripeConnectInstance}>{children}</ConnectComponentsProvider>
}
