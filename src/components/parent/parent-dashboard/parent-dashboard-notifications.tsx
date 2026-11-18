import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

export function ParentDashboardNotifications() {
  const { loggedInUserId } = useLoggedInUser()

  const { data: pendingDocuments } = api.documentsUsers.listFromParentId.useQuery(
    {
      parentId: loggedInUserId!,
      status: DocumentsUsersStatusEnum.PENDING,
    },
    {
      enabled: !!loggedInUserId,
    }
  )

  const { data: campaignsEndingSoon } = api.campaigns.getCampaignsAboutToEndForParent.useQuery(
    {
      parentId: loggedInUserId!,
      status: CampaignsStatusEnum.ACTIVE,
    },
    {
      enabled: !!loggedInUserId,
    }
  )

  const hasPendingDocuments = pendingDocuments && pendingDocuments.length > 0
  const hasCampaignsEndingSoon = campaignsEndingSoon && campaignsEndingSoon.length > 0

  if (!hasPendingDocuments && !hasCampaignsEndingSoon) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">Notifications</div>

      {hasPendingDocuments && (
        <div className="flex gap-6 items-center justify-between bg-yellow-50/50 border border-orange-300 rounded-lg p-6 shadow-elev-1">
          <div className="flex flex-col gap-2 tracking-tighter leading-4">
            <div className="text-base font-semibold">
              You have {pendingDocuments.length} permission slip{pendingDocuments.length > 1 ? "s" : ""} to sign
            </div>
            <div className="text-sm text-muted-foreground">
              Click here to go to your documents page and manage all your family slips.
            </div>
          </div>
          <Link href="/dashboard/documents">
            <ArrowRight />
          </Link>
        </div>
      )}

      {hasCampaignsEndingSoon && (
        <div className="flex gap-6 items-center justify-between bg-yellow-50/50 border border-orange-300 rounded-lg p-6 shadow-elev-1">
          <div className="flex flex-col gap-2 tracking-tighter leading-4">
            <div className="text-base font-semibold">
              {campaignsEndingSoon.length} fundraiser{campaignsEndingSoon.length > 1 ? "s are" : " is"} ending soon
            </div>
            <div className="text-sm text-muted-foreground">
              {campaignsEndingSoon.length === 1
                ? `${campaignsEndingSoon[0]?.campaignName} ${campaignsEndingSoon[0]?.daysRemaining === 0 ? "ends soon" : `ends in ${campaignsEndingSoon[0]?.daysRemaining} day${campaignsEndingSoon[0]?.daysRemaining !== 1 ? "s" : ""}`}. Click here to review fundraiser progress.`
                : `Multiple fundraisers are ending within 5 days. Click here to review all fundraiser progress.`}
            </div>
          </div>
          <Link href="/dashboard/campaigns">
            <ArrowRight />
          </Link>
        </div>
      )}

      {!hasPendingDocuments && !hasCampaignsEndingSoon && (
        <div className="text-sm text-muted-foreground">No notifications at this time.</div>
      )}
    </div>
  )
}
