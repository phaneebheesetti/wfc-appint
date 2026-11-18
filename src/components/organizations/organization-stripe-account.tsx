"use client"

import {
  ConnectAccountManagement,
  ConnectBalances,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
} from "@stripe/react-connect-js"
import { CircleDollarSign, Receipt, ReceiptText, Settings } from "lucide-react"

import { NotFound } from "@/components/not-found"
import { StripeConnectButton } from "@/components/stripe-connect"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsSimple } from "@/components/ui/tabs"
import { StripeConnectProvider } from "@/providers"
import { api } from "@/trpc/react"

interface OrganizationStripeAccountProps {
  organizationId: string
}

export function OrganizationStripeAccount({ organizationId }: OrganizationStripeAccountProps) {
  const { data: organization, isLoading } = api.organizations.getById.useQuery({ id: organizationId })

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-10 w-[500px]" />
      </div>
    )

  if (!organization) return <NotFound />

  if (!organization?.stripeConnectedAccountId) {
    return <StripeConnectButton organizationId={organization.id} />
  }

  return (
    <StripeConnectProvider stripeAccountId={organization.stripeConnectedAccountId}>
      <div className="flex flex-col gap-2">
        <div>
          Stripe Connected Account ID: <i className="font-medium">{organization.stripeConnectedAccountId}</i>
        </div>

        <ConnectNotificationBanner />

        <TabsSimple
          tabs={[
            {
              label: "Balance",
              value: "balance",
              content: <ConnectBalances />,
              icon: CircleDollarSign,
            },
            {
              label: "Payments",
              value: "payments",
              content: <ConnectPayments />,
              icon: Receipt,
            },
            {
              label: "Payouts",
              value: "payouts",
              content: <ConnectPayouts />,
              icon: ReceiptText,
            },
            {
              label: "Account Management",
              value: "account-management",
              content: <ConnectAccountManagement />,
              icon: Settings,
            },
          ]}
          defaultTab="balance"
        />
      </div>
    </StripeConnectProvider>
  )
}
