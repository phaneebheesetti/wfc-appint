"use client"

import { ChevronLeft, QrCode } from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useState } from "react"

import { CampaignDashboard } from "@/components/campaigns/campaign-dashboard/campaign-dashboard"
import { CampaignPrizesEvents } from "@/components/campaigns/campaign-prizes-events/campaign-prizes-events"
import { NotFound } from "@/components/not-found"
import { ParticipantQRCodeModal } from "@/components/participant/participant-qr-code-modal"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsWithHash } from "@/components/ui/tabs"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { formatDate, getPercentageOfTimePassed } from "@/utils/date"

export default function CampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const { loggedInUserId, loggedInRole, isLoading: isLoggedInUserLoading } = useLoggedInUser()
  const [participantQRCodeModalOpen, setParticipantQRCodeModalOpen] = useState(false)
  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId

  const { data: campaign, isLoading: isCampaignLoading } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data: user, isLoading: isUserLoading } = api.users.getById.useQuery(
    { id: userIdToUse! },
    { enabled: !!loggedInUserId }
  )

  if (isCampaignLoading || isUserLoading || isLoggedInUserLoading)
    return (
      <div className="flex flex-col gap-4 pb-12">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-40" />
        <Skeleton className="w-full h-40" />
        <div className="flex gap-2">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>
      </div>
    )

  if (!user || !campaign) return <NotFound />

  const percentageOfTimePassed = getPercentageOfTimePassed(campaign.startDate, campaign.endDate)

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Link href="/dashboard/campaigns">
            <ChevronLeft />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold">{campaign?.name}</h2>
            {campaign?.organization?.name && (
              <span className="text-sm text-muted-foreground">{campaign.organization.name}</span>
            )}
          </div>
        </div>

        {campaign?.digitalPayment && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button className="hidden md:flex" onClick={() => setParticipantQRCodeModalOpen(true)}>
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

      <div className="flex flex-col gap-1">
        <Progress value={percentageOfTimePassed} className="[&>*]:bg-blue-500" showPercentage />
        <div className="text-sm text-muted-foreground">
          Fundraiser runs from {campaign?.startDate ? formatDate(campaign.startDate, { month: "short" }) : "-"} to{" "}
          {campaign?.endDate ? formatDate(campaign.endDate, { month: "short" }) : "-"}
        </div>
      </div>

      <TabsWithHash
        tabs={[
          {
            label: "Dashboard",
            value: "dashboard",
            content: <CampaignDashboard user={user} campaign={campaign} />,
          },
          {
            label: "Prizes & Events",
            value: "prizes-events",
            content: <CampaignPrizesEvents user={user} campaign={campaign} />,
          },
        ]}
        tabsListClassName="flex-row"
      />
    </div>
  )
}
