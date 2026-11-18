"use client"

import { CreditCard, Megaphone, UserCog } from "lucide-react"
import { useParams } from "next/navigation"

import { CampaignsList } from "@/components/campaigns"
import { NotFound } from "@/components/not-found"
import { OrganizationStripeAccount, OrganizationsHeader } from "@/components/organizations"
import { OrganizationsMembersList } from "@/components/organizations-users"
import { type Tab, TabsWithHash } from "@/components/ui/tabs"
import { RolesEnum } from "@/constants/roles"

export default function OrganizationPage() {
  const { organizationId } = useParams<{ organizationId: string }>()

  if (!organizationId) {
    return <NotFound />
  }

  const tabs: Tab[] = [
    {
      label: "Fundraisers",
      value: "campaigns",
      content: <CampaignsList organizationId={organizationId} />,
      icon: Megaphone,
    },
    {
      label: "Members",
      value: "members",
      content: <OrganizationsMembersList organizationId={organizationId} />,
      icon: UserCog,
    },
    {
      label: "Stripe Account",
      value: "stripe-account",
      content: <OrganizationStripeAccount organizationId={organizationId} />,
      roles: [RolesEnum.ADMIN, RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
      icon: CreditCard,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <OrganizationsHeader
        organizationId={organizationId}
        goBackHref={"/dashboard/organizations"}
        goBackLabel="Go back to the organizations"
      />
      <TabsWithHash tabs={tabs} />
    </div>
  )
}
