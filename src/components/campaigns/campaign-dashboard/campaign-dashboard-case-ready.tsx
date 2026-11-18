import Image from "next/image"

import { type Campaign, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface CampaignDashboardCaseReadyProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboardCaseReady({ user, campaign }: CampaignDashboardCaseReadyProps) {
  const { data: organizationUser } = api.organizationsUsers.getByUserAndOrganizationId.useQuery(
    { userId: user.id, organizationId: campaign.organizationId },
    { enabled: !!user.id && !!campaign.organizationId }
  )

  const { data: casesTransactions = [] } = api.casesTransactions.getAllFromUserAtCampaign.useQuery(
    { userId: user.id, campaignId: campaign.id },
    { enabled: !!user.id && !!campaign.id }
  )

  if (casesTransactions.length > 0) {
    return null
  }

  if (!organizationUser?.eligible) {
    return null
  }

  return (
    <div className="flex gap-6 items-center justify-between bg-yellow-50 border border-yellow-300 rounded-card p-6">
      <Image src="/participant/chocolate-case-ready.png" alt="Chocolate permission Slip" width={129} height={120} />

      <div className="flex flex-col gap-2 tracking-tighter leading-4 text-sm">
        <div className="font-semibold">Your chocolate case is ready to go!</div>
        <div className="text-xs">That&apos;s right! Go to your organization to get your case and earn your prizes!</div>
      </div>
    </div>
  )
}
