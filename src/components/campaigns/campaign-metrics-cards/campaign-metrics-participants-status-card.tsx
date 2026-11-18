"use client"

import { Users } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"

interface CampaignMetricsParticipantsStatusCardProps {
  activeUsers: number
  totalUsers: number
}

export function CampaignMetricsParticipantsStatusCard({
  activeUsers,
  totalUsers,
}: CampaignMetricsParticipantsStatusCardProps) {
  return (
    <MetricCard
      title="Participants Status"
      icon={Users}
      value={activeUsers}
      goal={totalUsers}
      goalDescriptionText="Active / Total:"
      goalDescriptionValue={`${activeUsers} / ${totalUsers}`}
      color={ColorEnum.YELLOW}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Active Participants</p>
          <hr />
          <p>Divided by the number of participants on the fundraiser</p>
        </div>
      }
    />
  )
}
