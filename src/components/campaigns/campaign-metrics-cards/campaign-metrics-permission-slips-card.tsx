"use client"

import { FileCheck } from "lucide-react"

import { MetricCard } from "@/components/ui/card"
import { ColorEnum } from "@/constants/colors"

interface CampaignMetricsPermissionSlipsCardProps {
  signedPermissionSlips: number
  totalPermissionSlips: number
}

export function CampaignMetricsPermissionSlipsCard({
  signedPermissionSlips,
  totalPermissionSlips,
}: CampaignMetricsPermissionSlipsCardProps) {
  return (
    <MetricCard
      title="Permission Slips Signed"
      icon={FileCheck}
      value={signedPermissionSlips}
      goal={totalPermissionSlips}
      goalDescriptionText="Signed / Total:"
      goalDescriptionValue={`${signedPermissionSlips} / ${totalPermissionSlips}`}
      color={ColorEnum.RED}
      tooltip={
        <div className="flex flex-col gap-2 font-normal">
          <p>Number of permission slips signed by participants</p>
          <hr />
          <p>Divided by the total number of required permission slips</p>
        </div>
      }
    />
  )
}
