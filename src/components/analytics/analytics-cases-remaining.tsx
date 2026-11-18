"use client"

import { useMemo } from "react"
import { Cell, Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/env"
import { api } from "@/trpc/react"

interface AnalyticsCasesRemainingProps {
  campaignId: string
}

export function AnalyticsCasesRemaining({ campaignId }: AnalyticsCasesRemainingProps) {
  const { data: inventoryItems, isLoading } = api.casesTransactions.getCurrentInventory.useQuery({
    campaignId,
  })

  const casesCheckedOut = useMemo(
    () => inventoryItems?.inventoryItems?.reduce((total, item) => total + Math.floor(item.checkedOutQuantity), 0) ?? 0,
    [inventoryItems]
  )

  const casesRemaining = useMemo(
    () => inventoryItems?.inventoryItems?.reduce((total, item) => total + Math.floor(item.availableQuantity), 0) ?? 0,
    [inventoryItems]
  )

  const { data: headerMetrics } = api.campaigns.getHeaderMetrics.useQuery({ campaignId })

  // Inventory adjustments lower the delivered value, same as the header cards
  const casesAdjusted =
    env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true" ? (headerMetrics?.totalCasesAdjusted ?? 0) : 0

  const casesDelivered = useMemo(
    () =>
      Math.max(
        (inventoryItems?.inventoryItems?.reduce((total, item) => total + Math.floor(item.deliveredQuantity), 0) ?? 0) -
          casesAdjusted,
        0
      ),
    [inventoryItems, casesAdjusted]
  )

  const checkedOutPercentage = casesDelivered > 0 ? Math.round((casesCheckedOut / casesDelivered) * 100) : 0

  if (isLoading) {
    return <Skeleton className="w-full h-80" />
  }

  const chartConfig = {
    remaining: {
      label: "Remaining",
    },
    checkedOut: {
      label: "Checked Out",
    },
  } satisfies ChartConfig

  const chartData = [
    {
      name: "Checked Out",
      value: checkedOutPercentage,
      fill: checkedOutPercentage >= 50 ? "#16A34A" : "#D97706",
    },
    {
      name: "Remaining",
      value: 100 - checkedOutPercentage,
      fill: "#EFE6D2",
    },
  ]

  return (
    <Card className="h-full w-full">
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-medium">Cases Remaining</CardTitle>

        <p className="text-sm text-[#8A7A67]">Checked out of delivered</p>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,40%)_1fr] gap-6 items-center">
          <ChartContainer config={chartConfig} className="mx-auto w-full max-w-[180px] aspect-square">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="75%" stroke="none">
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}

                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {checkedOutPercentage}%
                          </tspan>

                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            checked out
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
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Remaining</p>

                <p className="text-3xl font-bold">{casesRemaining}</p>
              </div>

              <div className="flex flex-col items-center min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Delivered</p>

                <p className="text-3xl font-bold">{casesDelivered}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
