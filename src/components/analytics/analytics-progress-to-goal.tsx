"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { env } from "@/env"
import { api } from "@/trpc/react"
import { formatCurrency } from "@/utils/money"

interface AnalyticsProgressToGoalProps {
  campaignId: string
}

export function AnalyticsProgressToGoal({ campaignId }: AnalyticsProgressToGoalProps) {
  const { data: campaign } = api.campaigns.getById.useQuery({
    id: campaignId,
  })

  const { data: headerMetrics, isLoading } = api.campaigns.getHeaderMetrics.useQuery({
    campaignId,
  })

  const { data: totalsByWeekday } = api.paymentLogs.getTotalByPaymentMethodAndWeekday.useQuery({
    campaignId,
  })

  const { data: inventoryItems } = api.casesTransactions.getCurrentInventory.useQuery({
    campaignId,
  })

  const digitalSharePercentage = totalsByWeekday?.paymentSummary?.digital?.percentage ?? 0

  const casesCheckedOut =
    inventoryItems?.inventoryItems?.reduce((total, item) => total + Math.floor(item.checkedOutQuantity), 0) ?? 0

  // Inventory adjustments lower the delivered / goal values, same as the header cards
  const isInventoryUpdatesEnabled = env.NEXT_PUBLIC_FF_INVENTORY_PRODUCT_UPDATES === "true"
  const casesAdjusted = isInventoryUpdatesEnabled ? (headerMetrics?.totalCasesAdjusted ?? 0) : 0
  const paymentAdjusted = isInventoryUpdatesEnabled ? (headerMetrics?.totalPaymentAdjusted ?? 0) : 0
  const paymentExpected = Math.max((headerMetrics?.totalPaymentExpected ?? 0) - paymentAdjusted, 0)

  const casesDelivered = Math.max(
    (inventoryItems?.inventoryItems?.reduce((total, item) => total + Math.floor(item.deliveredQuantity), 0) ?? 0) -
      casesAdjusted,
    0
  )

  const checkedOutPercentage = casesDelivered > 0 ? Math.round((casesCheckedOut / casesDelivered) * 100) : 0

  const progressPercentage =
    paymentExpected > 0 ? ((headerMetrics?.totalPaymentCollected ?? 0) / paymentExpected) * 100 : 0

  const paymentCollectedPercentage = Math.round(progressPercentage)

  const leftToGoal = paymentExpected - (headerMetrics?.totalPaymentCollected ?? 0)

  const daysRemaining = (headerMetrics?.campaignDaysTotal ?? 0) - (headerMetrics?.dayPassed ?? 0)

  const raisedPerDay = headerMetrics?.dayPassed
    ? (headerMetrics.totalPaymentCollected ?? 0) / headerMetrics.dayPassed
    : 0

  const chartData = [
    {
      name: "Cases Checked Out",
      value: checkedOutPercentage,
      color: "#16A34A",
    },
    {
      name: "Payment Collected",
      value: paymentCollectedPercentage,
      color: "#6E3332",
    },
    {
      name: "Digital Share",
      value: digitalSharePercentage,
      color: "#FFA004",
    },
  ]

  const radii = [
    { inner: 82, outer: 100 }, // Cases Checked Out (OUTER)
    { inner: 63, outer: 77 }, // Payment Collected (MIDDLE)
    { inner: 44, outer: 56 }, // Digital Share (INNER)
  ]

  if (isLoading) {
    return <Skeleton className="w-full h-[180px]" />
  }

  return (
    <Card className="min-h-[280px]">
      <CardHeader className="pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {campaign?.name?.toUpperCase()} • PROGRESS TO GOAL
        </p>
      </CardHeader>

      <CardContent className="space-y-1">
        {/* TOP SECTION */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* LEFT SIDE */}
          <div className="flex-1">
            <h2 className="font-bold leading-none">
              <span className="text-6xl">{Math.round(progressPercentage)}</span>
              <span className="text-5xl">%</span>
            </h2>

            <div className="mt-2">
              {progressPercentage < 100 && (
                <>
                  <h2 className="text-4xl font-bold">{formatCurrency(headerMetrics?.totalPaymentCollected ?? 0, 2)}</h2>

                  <p className="text-sm text-muted-foreground">raised of {formatCurrency(paymentExpected, 2)} goal</p>
                </>
              )}
              {/* Progress Bar */}
              <div className="mt-4 mb-6">
                <Progress
                  value={progressPercentage}
                  className="mt-6 h-3 w-[93%] bg-[#EFE6D2]"
                  indicatorClassName="bg-[#16A34A]"
                />
              </div>
              {/* Bottom Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col items-center text-center">
                  <p className="text-3xl font-semibold">{formatCurrency(leftToGoal, 2)}</p>
                  <p className="text-sm text-muted-foreground">Left to Goal</p>
                </div>

                <div className="flex flex-col items-center text-center sm:border-x">
                  <p className="text-3xl font-bold">
                    {daysRemaining} <span className="text-2xl font-semibold">days</span>
                  </p>

                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>

                <div className="flex flex-col items-center text-center">
                  <p className="text-3xl font-semibold">{formatCurrency(raisedPerDay, 2)}</p>
                  <p className="text-sm text-muted-foreground">Raised / Day</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 mt-6">
            <div className="w-full max-w-[280px] aspect-square">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {chartData.map((item, index) => (
                    <Pie
                      key={item.name}
                      data={[{ value: item.value }, { value: 100 - item.value }]}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      innerRadius={radii[index]!.inner}
                      outerRadius={radii[index]!.outer}
                      stroke="none"
                    >
                      <Cell fill={item.color} />
                      <Cell fill="#EFE6D2" />
                    </Pie>
                  ))}
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-green-600 rounded" />
                <div>
                  <p className="text-3xl font-bold">{checkedOutPercentage}%</p>
                  <p className="text-sm uppercase">Cases Checked Out</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-neutral-800 rounded" />
                <div>
                  <p className="text-3xl font-bold">{paymentCollectedPercentage}%</p>
                  <p className="text-sm uppercase">Payment Collected</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-amber-500 rounded" />
                <div>
                  <p className="text-3xl font-bold">{digitalSharePercentage}%</p>
                  <p className="text-sm uppercase">Digital Share</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
