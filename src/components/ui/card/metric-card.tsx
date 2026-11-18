import { type LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { InfoTooltip } from "@/components/ui/tooltip"
import { COLOR_MAP, type ColorEnum } from "@/constants/colors"
import { cn } from "@/utils/cn"

export interface IMetricCard {
  title: string
  tooltip?: React.ReactNode
  icon: LucideIcon
  value: number
  goal: number
  goalDescriptionText: string
  goalDescriptionValue: string
  color: ColorEnum
}

interface MetricCardProps extends IMetricCard {
  className?: string
}

export function MetricCard({
  title,
  tooltip,
  icon: Icon,
  value,
  goal,
  goalDescriptionText,
  goalDescriptionValue,
  color,
}: MetricCardProps) {
  const progress =
    goal === 0
      ? 0 // Handle the case when goal is 0 to avoid division by zero
      : Math.round((value / goal) * 100 * 100) / 100

  const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

  return (
    <Card key={title} className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2 space-y-0">
        <CardTitle className="flex flex-row items-center gap-2">
          <span className="text-muted-foreground text-sm leading-5">{title}</span>

          {tooltip && <InfoTooltip content={tooltip} side="top" />}
        </CardTitle>

        <Icon className={cn("w-6 h-6", colorClasses.text)} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-medium">{progress}%</p>
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{goalDescriptionText}</p>
            <div className="h-px w-full bg-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">{goalDescriptionValue}</p>
          </div>
        </div>

        <Progress value={progress > 100 ? 100 : progress} className={colorClasses.progress} />
      </CardContent>
    </Card>
  )
}
