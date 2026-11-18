"use client"

import { Gift } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { InfoTooltip } from "@/components/ui/tooltip"
import { COLOR_MAP, ColorEnum } from "@/constants/colors"
import { cn } from "@/utils/cn"

interface CampaignMetricsFeaturesCardProps {
  digitalPayment: boolean
  digitalPermissionSlip: boolean
  homeRunPrizesTemplate: boolean
  prizeTemplateName?: string | null
}

export function CampaignMetricsFeaturesCard({
  digitalPayment,
  digitalPermissionSlip,
  homeRunPrizesTemplate,
  prizeTemplateName,
}: CampaignMetricsFeaturesCardProps) {
  const colorClasses = COLOR_MAP[ColorEnum.PURPLE]

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 space-y-0">
        <CardTitle className="flex flex-row items-center gap-2">
          <span className="text-muted-foreground text-sm leading-5">Features</span>

          <InfoTooltip
            content={
              <div className="flex flex-col gap-2 font-normal">
                <p>Features enabled in this fundraiser</p>
              </div>
            }
            side="top"
          />
        </CardTitle>

        <Gift className={cn("w-6 h-6", colorClasses.text)} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox className="disabled:opacity-100" disabled checked={digitalPayment} />
            <span className="text-sm">Digital Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox className="disabled:opacity-100" disabled checked={digitalPermissionSlip} />
            <span className="text-sm">Digital Permission Slips</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox className="disabled:opacity-100" disabled checked={homeRunPrizesTemplate} />
            <span className="text-sm">{prizeTemplateName ?? "Home Run Prizes Template"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
