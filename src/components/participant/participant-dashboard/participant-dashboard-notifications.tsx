import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { api } from "@/trpc/react"

interface ParticipantDashboardNotificationsProps {
  userId: string
}

export function ParticipantDashboardNotifications({ userId }: ParticipantDashboardNotificationsProps) {
  const { data: documentsUsers = [] } = api.documentsUsers.getByUserId.useQuery(
    { userId, status: DocumentsUsersStatusEnum.PENDING },
    { enabled: !!userId }
  )

  const { data: campaigns = [] } = api.campaigns.getActiveCampaignsByUserId.useQuery({ userId }, { enabled: !!userId })
  const almostOverCampaigns = campaigns.filter(campaign => {
    const fiveDaysBeforeEndDate = new Date(campaign.endDate)
    fiveDaysBeforeEndDate.setDate(fiveDaysBeforeEndDate.getDate() - 5)

    return (campaign.status as CampaignsStatusEnum) === CampaignsStatusEnum.ACTIVE && new Date() > fiveDaysBeforeEndDate
  })

  const hasPendingDocuments = documentsUsers.length > 0
  const hasAlmostOverCampaigns = almostOverCampaigns.length > 0

  if (!hasPendingDocuments && !hasAlmostOverCampaigns) return null

  return (
    <div className="flex flex-col gap-4 md:p-4 md:rounded-lg md:border md:bg-card md:shadow-elev-1">
      <div className="text-xl font-semibold">Notifications</div>

      {documentsUsers.map(documentUser => (
        <div
          key={documentUser.id}
          className="flex gap-6 items-center justify-between bg-yellow-50/50 border border-orange-300 rounded-lg p-6 shadow-elev-1"
        >
          <Image src="/participant/chocolate-slip.png" alt="Chocolate permission Slip" width={80} height={93} />

          <div className="flex flex-col gap-2 tracking-tighter leading-4 text-sm">
            <div className="font-semibold">
              Heads up! A new permission slip needs your parent’s signature before you can join.
            </div>
            <div className="italic">Fundraiser: {documentUser.document.campaign?.name}</div>
          </div>
        </div>
      ))}

      {almostOverCampaigns.map(campaign => (
        <div
          key={campaign.id}
          className="flex gap-6 items-center justify-between bg-yellow-50/50 border border-orange-300 rounded-lg p-6 shadow-elev-1"
        >
          <div className="tracking-tighter leading-4">
            <span className="font-semibold">Hurry!</span> The {campaign.name} campaign is almost over.
          </div>

          <Link href={`/dashboard/campaigns/${campaign.id}`}>
            <ArrowRight />
          </Link>
        </div>
      ))}
    </div>
  )
}
