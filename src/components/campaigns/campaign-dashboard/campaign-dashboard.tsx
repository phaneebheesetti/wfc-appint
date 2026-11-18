import { QrCode } from "lucide-react"
import { useState } from "react"

import { ParticipantQRCodeModal } from "@/components/participant/participant-qr-code-modal"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { type Campaign, type DigitalSalesDetails, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"

import { CampaignDashboardCaseReady } from "./campaign-dashboard-case-ready"
import { CampaignDashboardEvents } from "./campaign-dashboard-events"
import { CampaignDashboardLatestActivities } from "./campaign-dashboard-latest-activities"
import { CampaignDashboardPrizes } from "./campaign-dashboard-prizes"
import { CampaignDashboardStats } from "./campaign-dashboard-stats"
import { CampaignDashboardTotalProgress } from "./campaign-dashboard-total-progress"
import { DigitalSalesCard } from "./digital-sales/digital-sales-card"
import { OrdersCard } from "./digital-sales/orders-card"

interface CampaignDashboardProps {
  user: User
  campaign: Campaign
}

export function CampaignDashboard({ user, campaign }: CampaignDashboardProps) {
  const [participantQRCodeModalOpen, setParticipantQRCodeModalOpen] = useState(false)
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const isEnabled = loggedInRole === RolesEnum.PARENT && env.NEXT_PUBLIC_DIGITAL_SALES_ENABLED === "true"
  const userIdToUse = loggedInRole === RolesEnum.PARENT ? user.id : loggedInUserId
  const { data: salesInfo } = api.digitalSalesInformation.getByParticipantAndFundraiser.useQuery(
    { participantId: userIdToUse!, fundraiserId: campaign.id },
    { enabled: isEnabled && !!userIdToUse && !!campaign.id }
  )

  const details: DigitalSalesDetails = salesInfo?.digitalSalesDetails ?? {}

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid gap-4 h-fit">
          <CampaignDashboardTotalProgress campaign={campaign} />
          <CampaignDashboardCaseReady user={user} campaign={campaign} />
          <CampaignDashboardStats user={user} campaign={campaign} />
        </div>
        <div className="grid gap-4 h-fit">
          <CampaignDashboardPrizes user={user} campaign={campaign} />
          <CampaignDashboardEvents user={user} campaign={campaign} />
          <CampaignDashboardLatestActivities user={user} campaign={campaign} />
        </div>

        {campaign?.digitalPayment && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    className="w-fit fixed bottom-20 left-1/2 -translate-x-1/2 md:hidden"
                    onClick={() => setParticipantQRCodeModalOpen(true)}
                  >
                    Receive Digital Payment <QrCode />
                  </Button>
                </span>
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>
        )}

        <ParticipantQRCodeModal
          open={participantQRCodeModalOpen}
          onOpenChange={setParticipantQRCodeModalOpen}
          pin={user?.pin ?? ""}
        />
      </div>

      {/* Full-width band below the grid — desktop and mobile */}
      <DigitalSalesCard user={user} campaign={campaign} />

      {details.enable_sales_page?.is_active && salesInfo?.id && (
        <OrdersCard
          digitalSalesId={salesInfo.id}
          campaignId={campaign.id}
          userId={user.id}
          participantFirstName={user.firstName ?? ""}
        />
      )}
    </div>
  )
}
