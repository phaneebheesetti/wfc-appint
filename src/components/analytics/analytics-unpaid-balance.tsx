"use client"

import { Cell, Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"
import { formatCurrency } from "@/utils/money"

interface AnalyticsUnpaidBalanceProps {
  campaignId: string
}

export function AnalyticsUnpaidBalance({ campaignId }: AnalyticsUnpaidBalanceProps) {
  // TODO: this needs to be redone when we have the paid balance in the database
  const { data: metrics, isLoading } = api.campaigns.getHeaderMetrics.useQuery({ campaignId })

  const paidPercentage = metrics?.totalParticipants
    ? Math.round(((metrics.participantsPaid ?? 0) / metrics.totalParticipants) * 100)
    : 0

  const chartConfig = {
    paid: {
      label: "Paid",
    },
    remaining: {
      label: "Remaining",
    },
  } satisfies ChartConfig

  const chartData = [
    {
      name: "Paid",
      value: paidPercentage,
      fill: paidPercentage >= 50 ? "#16A34A" : "#D97706",
    },
    {
      name: "Remaining",
      value: 100 - paidPercentage,
      fill: "#EFE6D2",
    },
  ]

  if (isLoading) {
    return <Skeleton className="w-full h-80" />
  }

  return (
    <Card className="h-full w-full">
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-medium">Payment Collected</CardTitle>

        <p className="text-sm text-[#8A7A67]">Participants paid</p>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,40%)_1fr] gap-6 items-center">
          {/* Donut */}
          <ChartContainer config={chartConfig} className="mx-auto w-full max-w-[180px] aspect-square">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="75%" stroke="none">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}

                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {paidPercentage}%
                          </tspan>

                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            paid
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          {/* Right Side */}
          <div className="flex-1 min-w-0">
            <div className="border-t border-dashed border-[#EFE6D2] mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col items-center min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Paid</p>

                <p className="text-3xl font-bold">{metrics?.participantsPaid ?? 0}</p>
              </div>

              <div className="flex flex-col items-center min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Owed</p>

                <p className="text-3xl font-bold">{formatCurrency(metrics?.totalPaymentDue ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
