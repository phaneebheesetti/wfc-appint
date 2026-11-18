"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Campaign, type Organization } from "@/server/db/schema"
import { formatCentsToCurrency } from "@/utils/money"

interface CampaignsPayoutButtonProps {
  campaign: Campaign
  organization: Organization
  onOpenChange: (open: boolean) => void
  label?: string
  buttonVariant?: "default" | "outline"
}

interface SourceTypes {
  card: number
}

interface BalanceAmount {
  amount: number
  currency: string
  source_types: SourceTypes
}

interface StripeBalance {
  balance: {
    object: string
    available: BalanceAmount[]
    instant_available: BalanceAmount[]
    livemode: boolean
    pending: BalanceAmount[]
  }
}

export function CampaignsPayoutButton({
  campaign,
  organization,
  onOpenChange,
  label = "Payout Fundraiser",
  buttonVariant = "default",
}: CampaignsPayoutButtonProps) {
  const [balance, setBalance] = useState<string>("")
  const [canPayout, setCanPayout] = useState<boolean>(false)
  const { loggedInRole: role } = useLoggedInUser()

  const stripeConnectedAccountId = organization.stripeConnectedAccountId

  useEffect(() => {
    if (!stripeConnectedAccountId || !role || campaign.status !== String(CampaignsStatusEnum.ENDED)) {
      return
    }

    const hasPayoutPermission = [RolesEnum.ADMIN, RolesEnum.ORGANIZATION_ADMIN].includes(role)
    setCanPayout(hasPayoutPermission)
    if (!hasPayoutPermission) {
      return
    }

    const fetchBalance = async () => {
      const response = await fetch("/api/stripe/balance", {
        method: "POST",
        body: JSON.stringify({ stripeAccountId: stripeConnectedAccountId }),
      })

      if (!response.ok) {
        await response.json()
      } else {
        const json = (await response.json()) as { data: StripeBalance["balance"] }
        const available = json.data.available.reduce((acc: number, curr: BalanceAmount) => acc + curr.amount, 0)
        if (available > 0) {
          setBalance(formatCentsToCurrency(available))
        }
      }
    }

    void fetchBalance()
  }, [stripeConnectedAccountId, campaign.status, role])

  if (!role) {
    return null
  }

  return (
    <>
      {canPayout && (
        <Button onClick={() => onOpenChange(true)} variant={buttonVariant} disabled={!balance || balance === "$0.00"}>
          {label} {balance ? `(${balance})` : ""}
        </Button>
      )}
    </>
  )
}
