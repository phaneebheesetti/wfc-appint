import { Eye, Megaphone, QrCode } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { ParticipantQRCodeModal } from "@/components/participant/participant-qr-code-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { WithTooltip } from "@/components/ui/tooltip"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { getTotalCasesCheckedOut, getTotalCasesDelivered } from "@/utils/cases-transactions"

interface ParticipantDashboardActiveCampaignsProps {
  userId: string
}

export function ParticipantDashboardActiveCampaigns({ userId }: ParticipantDashboardActiveCampaignsProps) {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const [participantQRCodeModalOpen, setParticipantQRCodeModalOpen] = useState(false)

  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId

  const { data: user } = api.users.getById.useQuery({ id: userIdToUse! }, { enabled: !!loggedInUserId })

  const { data: campaigns = [], isLoading } = api.campaigns.getActiveCampaignsByUserId.useQuery(
    { userId: userIdToUse! },
    { enabled: !!loggedInUserId }
  )

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        Your Active Fundraisers
        <WithTooltip
          content="View all fundraisers"
          side="top"
          trigger={
            <Link href="/dashboard/campaigns">
              <Megaphone className="w-4 h-4" />
            </Link>
          }
        />
      </div>

      <ParticipantQRCodeModal
        open={participantQRCodeModalOpen}
        onOpenChange={setParticipantQRCodeModalOpen}
        pin={user?.pin ?? ""}
      />

      {isLoading && <Skeleton className="w-full h-48 rounded-xl" />}

      {!isLoading && campaigns.length === 0 && (
        <div className="text-sm text-muted-foreground">No active fundraisers found</div>
      )}

      {!isLoading &&
        campaigns.map(campaign => {
          const totalCasesCheckedOut = getTotalCasesCheckedOut(campaign.casesTransactions)
          const totalCasesDelivered = getTotalCasesDelivered(campaign.casesTransactions)

          const progress = totalCasesDelivered > 0 ? Math.round((totalCasesCheckedOut / totalCasesDelivered) * 100) : 0

          return (
            <div className="flex flex-col gap-4 p-4 bg-accent rounded-xl" key={campaign.id}>
              <div className="flex justify-between items-center font-semibold">
                {campaign.name}

                <Link
                  href={
                    loggedInRole === RolesEnum.PARENT
                      ? `/dashboard/campaigns/${campaign.id}?userId=${userId}`
                      : `/dashboard/campaigns/${campaign.id}`
                  }
                >
                  <Button variant="outline">
                    <Eye />
                    View
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-semibold">{progress}%</div>
                  <Progress value={progress} className="w-full bg-input [&>*]:bg-brown-500" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalCasesCheckedOut} out of {totalCasesDelivered} Cases Checked Out
                </div>
              </div>

              {campaign?.digitalPayment && (
                <Button className="w-fit" onClick={() => setParticipantQRCodeModalOpen(true)}>
                  <QrCode /> Receive Digital Payment
                </Button>
              )}
            </div>
          )
        })}
    </Card>
  )
}
