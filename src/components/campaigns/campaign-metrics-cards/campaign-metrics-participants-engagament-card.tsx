"use client"

import { Users } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"

interface CampaignMetricsParticipantsEngagamentCardProps {
  engagedUsers: number
  totalUsers: number
}

export function CampaignMetricsParticipantsEngagamentCard({
  engagedUsers,
  totalUsers,
}: CampaignMetricsParticipantsEngagamentCardProps) {
  return (
    <MetricCard
      title="Participants Engagement"
      icon={Users}
      value={engagedUsers}
      goal={totalUsers}
      goalDescriptionText="Engaged / Total:"
      goalDescriptionValue={`${engagedUsers} / ${totalUsers}`}
      color={ColorEnum.YELLOW}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Participants that checked out at least one case</p>
          <hr />
          <p>Divided by the total number of participants</p>
        </div>
      }
    />
  )
}
