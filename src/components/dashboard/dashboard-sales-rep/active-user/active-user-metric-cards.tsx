"use client"

import { CircleAlert, CircleCheck, Rocket } from "lucide-react"

import { Card } from "@/components/ui/card"

interface ActiveUserMetricCardsProps {
  launchedCount: number
  needAttentionCount: number
  closedCount: number
}

export function ActiveUserMetricCards({ launchedCount, needAttentionCount, closedCount }: ActiveUserMetricCardsProps) {
  const metrics = [
    {
      label: "LAUNCHED",
      value: launchedCount,
      icon: Rocket,
      iconContainerClassName: "bg-emerald-50",
      iconClassName: "text-emerald-800",
    },
    {
      label: "NEED ATTENTION",
      value: needAttentionCount,
      icon: CircleAlert,
      iconContainerClassName: "bg-amber-50",
      iconClassName: "text-amber-800",
    },
    {
      label: "CLOSED",
      value: closedCount,
      icon: CircleCheck,
      iconContainerClassName: "bg-slate-100",
      iconClassName: "text-slate-800",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 w-full">
      {metrics.map(metric => {
        const Icon = metric.icon

        return (
          <Card
            key={metric.label}
            className="flex flex-row items-center gap-2 md:gap-3 lg:gap-4 p-3 md:p-4 lg:p-6 shadow-none"
          >
            <div
              className={`flex h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl ${metric.iconContainerClassName}`}
            >
              <Icon className={`h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 ${metric.iconClassName}`} />
            </div>

            <div className="flex flex-col">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold leading-none">{metric.value}</div>

              <div className="mt-2 text-xs font-medium tracking-wide text-muted-foreground">{metric.label}</div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
