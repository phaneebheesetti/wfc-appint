import { type LucideIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { InfoTooltip } from "@/components/ui/tooltip"
import { COLOR_MAP, type ColorEnum } from "@/constants/colors"
import { cn } from "@/utils/cn"
import { formatCurrency } from "@/utils/money"

type MetricCardColor = "orange" | "green" | "muted"

export interface IMetricCardSmall {
  title: string
  tooltip?: React.ReactNode
  icon: LucideIcon
  value: number | string
  description?: React.ReactNode
  color: MetricCardColor
  valueType?: "percent" | "currency"
  progress?: number
  progressColor?: ColorEnum
  onViewDetails?: () => void
}

interface MetricCardSmallProps extends IMetricCardSmall {
  className?: string
}

const colorMap: Record<MetricCardColor, { text: string }> = {
  orange: {
    text: "text-orange-500",
  },
  green: {
    text: "text-green-500",
  },
  muted: {
    text: "text-muted-foreground",
  },
}

export function MetricCardSmall({
  title,
  tooltip,
  icon: Icon,
  value,
  description,
  color,
  valueType,
  progress,
  progressColor,
  onViewDetails,
  className,
}: MetricCardSmallProps) {
  const iconColor = colorMap[color]?.text
  let progressBarColor = ""
  if (progressColor) {
    progressBarColor = COLOR_MAP[progressColor]?.progress ?? ""
  }

  const hasProgress = Boolean(progress && progress > 0)

  return (
    <Card key={title} className={cn("flex-1 min-h-[320px]", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <CardTitle className="flex flex-row items-center gap-2 min-h-10">
          <span className="text-muted-foreground text-sm leading-5">{title}</span>

          {tooltip && <InfoTooltip content={tooltip} side="top" />}
        </CardTitle>

        <Icon className={cn("w-4 h-4", iconColor)} />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-medium">
            {valueType === "percent" && `${value}%`}
            {valueType === "currency" && `${formatCurrency(Number(value))}`}
            {!valueType && value}
          </p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-xs text-left font-medium underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit"
            >
              View details
            </button>
          )}
        </div>
        {hasProgress && progressBarColor && (
          <div className="flex flex-col gap-2">
            <Progress value={progress} className={cn("h-2", progressBarColor)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
