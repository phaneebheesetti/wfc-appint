"use client"

import { formatDistanceToNow, isToday } from "date-fns"
import { History } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InfoTooltip } from "@/components/ui/tooltip"
import { COLOR_MAP, ColorEnum } from "@/constants/colors"
import { cn } from "@/utils/cn"

interface CampaignMetricsLastActivityCardProps {
  lastActivityAt: Date | null
}

export function CampaignMetricsLastActivityCard({ lastActivityAt }: CampaignMetricsLastActivityCardProps) {
  const colorClasses = COLOR_MAP[ColorEnum.CYAN]

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 space-y-0">
        <CardTitle className="flex flex-row items-center gap-2">
          <span className="text-muted-foreground text-sm leading-5">Last Login/Activity</span>

          <InfoTooltip
            content={
              <div className="flex flex-col gap-2 font-normal">
                <p>Last login/activity for this fundraiser</p>
              </div>
            }
            side="top"
          />
        </CardTitle>

        <History className={cn("w-6 h-6", colorClasses.text)} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-3">
          {lastActivityAt
            ? `${isToday(lastActivityAt) ? "Today" : formatDistanceToNow(lastActivityAt)} ago`
            : "No activity yet"}
        </div>
      </CardContent>
    </Card>
  )
}
