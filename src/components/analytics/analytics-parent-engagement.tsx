import { Cell, Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface AnalyticsParentEngagementProps {
  campaignId: string
}

export function AnalyticsParentEngagement({ campaignId }: AnalyticsParentEngagementProps) {
  const { data: headerMetrics, isLoading } = api.campaigns.getHeaderMetrics.useQuery({
    campaignId,
  })

  const pendingParents = headerMetrics?.totalParentsPending ?? 0
  const activeParents = headerMetrics?.totalParentsActive ?? 0
  console.log("pending", pendingParents)
  console.log("active", activeParents)

  const totalInvited = activeParents + pendingParents
  const engagementPercentage = totalInvited > 0 ? Math.round((activeParents / totalInvited) * 100) : 0

  const chartConfig = {
    engagement: {
      label: "Engagement",
    },
  } satisfies ChartConfig

  const chartData = [
    {
      name: "Active",
      value: engagementPercentage,
      fill: engagementPercentage >= 50 ? "#16A34A" : "#D97706",
    },
    {
      name: "Pending",
      value: 100 - engagementPercentage,
      fill: "#EFE6D2",
    },
  ]

  if (isLoading) {
    return <Skeleton className="w-full h-[320px]" />
  }

  return (
    <Card className="min-h-[280px] h-full">
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-medium">Parent Engagement</CardTitle>

        <p className="text-sm text-[#8A7A67]">signed up & active</p>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,40%)_1fr] gap-6 items-center">
          <ChartContainer config={chartConfig} className="mx-auto w-full max-w-[180px] aspect-square">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="75%" stroke="none">
                {chartData.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}

                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {engagementPercentage}%
                          </tspan>

                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            of {totalInvited} invited
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex-1 min-w-0">
            <div className="border-t border-dashed border-[#EFE6D2] mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col items-center min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Active</p>

                <p className="text-3xl font-bold">{activeParents}</p>
              </div>

              <div className="flex flex-col items-center min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Pending</p>

                <p className="text-3xl font-bold">{pendingParents}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
