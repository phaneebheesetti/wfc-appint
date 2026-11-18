import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface AnalyticsDailyCasesCheckedOutProps {
  campaignId: string
}

export function AnalyticsDailyCasesCheckedOut({ campaignId }: AnalyticsDailyCasesCheckedOutProps) {
  const { data: dailyCasesCheckedOut, isLoading } = api.casesTransactions.getDailyCasesCheckedOut.useQuery({
    campaignId,
    groupBy: "day",
  })

  const chartConfig = {
    totalCases: {
      label: "Cases",
      color: "#E76E50",
    },
  } satisfies ChartConfig

  const chartData = useMemo(() => {
    const week = [
      { date: "M", totalCases: 0 },
      { date: "T", totalCases: 0 },
      { date: "W", totalCases: 0 },
      { date: "T", totalCases: 0 },
      { date: "F", totalCases: 0 },
      { date: "S", totalCases: 0 },
      { date: "S", totalCases: 0 },
    ]

    dailyCasesCheckedOut?.dailyData?.forEach(item => {
      const day = new Date(item.date).getDay()

      // JavaScript: 0=Sun,1=Mon,...6=Sat
      const index = day === 0 ? 6 : day - 1

      week[index]!.totalCases = item.totalCases
    })

    return week
  }, [dailyCasesCheckedOut])

  const dailyAverage = useMemo(() => {
    return dailyCasesCheckedOut?.summary?.dailyAverage ?? 0
  }, [dailyCasesCheckedOut])

  const maxCases = useMemo(() => {
    return Math.max(...(dailyCasesCheckedOut?.dailyData?.map(d => d.totalCases) ?? [0]))
  }, [dailyCasesCheckedOut])

  const yAxisMax = useMemo(() => {
    return Math.ceil(maxCases / 10) * 10
  }, [maxCases])

  const todayIndex = useMemo(() => {
    const day = new Date().getDay()
    // JavaScript: 0=Sun,1=Mon,...6=Sat
    return day === 0 ? 6 : day - 1
  }, [])

  if (isLoading) {
    return <Skeleton className="w-full h-[280px]" />
  }

  return (
    <Card className="min-h-[280px] h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex flex-row items-center gap-2 justify-between w-full">
          <div>
            <p className="font-medium text-xl">Daily Average</p>
            <p className="text-sm text-[#8A7A67]">cases checked out - last 7 days</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex items-end justify-center gap-2 mb-1">
          <span className="text-4xl font-bold text-[#5A2328]">{dailyAverage}</span>

          <span className="text-lg text-[#7A6B5C] mb-1">cases / day avg</span>
        </div>

        <div className="h-[130px] w-full">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                barSize={40}
                barCategoryGap="25%"
                margin={{
                  top: 0,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
                style={{
                  fontSize: "10px",
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, yAxisMax]}
                  ticks={Array.from({ length: yAxisMax / 10 + 1 }, (_, i) => i * 10)}
                  dx={-10}
                />
                <Bar
                  dataKey="totalCases"
                  radius={[8, 8, 0, 0]}
                  label={{
                    position: "top",
                    fill: "#5A2328",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        index === todayIndex
                          ? "#D97706" // today (warning/orange)
                          : "#EFE6D2" // other days (cream)
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
