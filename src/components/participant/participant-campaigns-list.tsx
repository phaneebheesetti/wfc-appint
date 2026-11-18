import { Eye } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { getPercentageOfTimePassed } from "@/utils/date"
import { formatDate } from "@/utils/date"

interface ParticipantCampaignsListProps {
  userId: string
  status: CampaignsStatusEnum
}

export function ParticipantCampaignsList({ userId, status }: ParticipantCampaignsListProps) {
  const { data: campaigns = [] } = api.campaigns.getCampaignsByUserId.useQuery({ userId }, { enabled: !!userId })

  const filteredCampaigns = campaigns.filter(campaign => (campaign.status as CampaignsStatusEnum) === status)

  if (filteredCampaigns.length === 0) {
    return <div className="text-sm text-muted-foreground">No fundraisers found</div>
  }

  return (
    <div className="flex flex-col gap-6">
      {filteredCampaigns.map(campaign => {
        const percentageOfTimePassed = getPercentageOfTimePassed(campaign.startDate, campaign.endDate)

        return (
          <Card
            key={campaign.id}
            className={cn("p-4 flex flex-col gap-6 rounded-xl", status === CampaignsStatusEnum.ENDED && "bg-muted")}
          >
            <div className="flex flex-col">
              <div className="flex justify-between items-center">
                <div className="font-semibold leading-tight">{campaign.name}</div>

                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  <Button variant="secondary">
                    <Eye />
                    View
                  </Button>
                </Link>
              </div>

              <div className="text-xs">
                {campaign.organization.name} &bull; {campaign.organization.city}
              </div>
            </div>

            <Progress
              value={percentageOfTimePassed}
              className="w-full bg-muted-foreground [&>*]:bg-blue-500"
              showPercentage
            />

            {status !== CampaignsStatusEnum.ACTIVE ? (
              <div className="text-sm text-muted-foreground">
                Fundraiser ended on {formatDate(campaign.endDate, { month: "short" })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Fundraiser runs from {formatDate(campaign.startDate, { month: "short" })} to{" "}
                {formatDate(campaign.endDate, { month: "short" })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
