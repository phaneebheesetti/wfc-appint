import { Cell, Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/env"
import { api } from "@/trpc/react"
import { formatCurrency } from "@/utils/money"

interface AnalyticsCashDigitalPaymentsProps {
  campaignId: string
}

export function AnalyticsCashDigitalPayments({ campaignId }: AnalyticsCashDigitalPaymentsProps) {
  const { data: totalsByWeekday, isLoading } = api.paymentLogs.getTotalByPaymentMethodAndWeekday.useQuery({
    campaignId,
  })

  const { data: headerMetrics } = api.campaigns.getHeaderMetrics.useQuery({
    campaignId,
  })

  // Inventory adjustments lower the expected value, same as the header cards
  const paymentAdjusted =
    env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true" ? (headerMetrics?.totalPaymentAdjusted ?? 0) : 0
  const paymentExpected = Math.max((headerMetrics?.totalPaymentExpected ?? 0) - paymentAdjusted, 0)

  const paymentCollectedPercentage =
    paymentExpected > 0 ? Math.round(((headerMetrics?.totalPaymentCollected ?? 0) / paymentExpected) * 100) : 0

  const paymentChartConfig = {
    cash: {
      label: "Cash",
    },
    digital: {
      label: "Digital",
    },
  } satisfies ChartConfig

  const cashPercentage = totalsByWeekday?.paymentSummary?.cash?.percentage ?? 0
  const digitalPercentage = totalsByWeekday?.paymentSummary?.digital?.percentage ?? 0
  const hasCollectedData = cashPercentage + digitalPercentage > 0

  const paymentChartData = hasCollectedData
    ? [
        {
          name: "Cash",
          value: cashPercentage,
          fill: "#16A34A",
        },
        {
          name: "Digital",
          value: digitalPercentage,
          fill: "#D97706",
        },
      ]
    : [
        {
          name: "No Data",
          value: 100,
          fill: "#EFE6D2",
        },
      ]

  if (isLoading) {
    return <Skeleton className="w-full h-80" />
  }

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
        <CardTitle className="flex flex-row items-center gap-2 justify-between w-full">
          <div>
            <p className="font-medium text-xl">Amount Collected</p>
            <p className="text-sm text-[#8A7A67]">of {formatCurrency(paymentExpected)} expected</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-[150px_1fr] gap-1 items-center">
          <ChartContainer config={paymentChartConfig} className="mx-auto w-full max-w-[160px] aspect-square">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

              <Pie
                data={paymentChartData}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="75%"
                stroke="none"
              >
                {paymentChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}

                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {paymentCollectedPercentage}%
                          </tspan>

                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground text-xs">
                            collected
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
          <div className="flex flex-col justify-center min-w-0 -ml-3">
            <div className="border-t border-dashed border-[#EFE6D2] mb-4" />

            <div className="text-center sm:text-left mb-4">
              <p className="text-[11px] uppercase tracking-wide text-[#7A6B5C] whitespace-nowrap">Total Collection</p>

              <p className="mt-1 text-3xl font-bold text-[#5A2328] whitespace-nowrap">
                {formatCurrency(headerMetrics?.totalPaymentCollected ?? 0)}
              </p>
            </div>

            <div className="space-y-2">
              {/* Cash */}
              <div className="grid grid-cols-[90px_1fr_auto] items-center gap-2">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="h-3 w-3 rounded-[3px] bg-[#16A34A] shrink-0" />
                  <span>Cash</span>
                </div>

                <span className="font-medium text-right whitespace-nowrap">
                  {formatCurrency(totalsByWeekday?.paymentSummary?.cash?.amount ?? 0)}
                </span>

                <span className="text-[#7A6B5C] whitespace-nowrap text-right">
                  {totalsByWeekday?.paymentSummary?.cash?.percentage}%
                </span>
              </div>

              {/* Digital */}
              <div className="grid grid-cols-[100px_1fr_auto] items-center gap-3 ">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <div className="h-3 w-3 rounded-[3px] bg-[#D97706] shrink-0" />
                  <span>Digital</span>
                </div>

                <span className="font-medium text-right whitespace-nowrap">
                  {formatCurrency(totalsByWeekday?.paymentSummary?.digital?.amount ?? 0)}
                </span>

                <span className="text-[#7A6B5C] whitespace-nowrap">
                  {totalsByWeekday?.paymentSummary?.digital?.percentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
