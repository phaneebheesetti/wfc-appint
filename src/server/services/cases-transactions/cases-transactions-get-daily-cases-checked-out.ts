import { and, eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { casesTransactions } from "@/server/db/schema"

interface DateGroup {
  date: string
  totalCases: number
  count: number
}

export const casesTransactionsGetDailyCasesCheckedOut = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    campaignId: string
    startDate?: string
    endDate?: string
    groupBy: "day" | "month"
  }
}) => {
  const { campaignId, startDate: fromDate, endDate: toDate, groupBy } = input
  const checkoutTransactions = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT)
    ),
    columns: {
      quantity: true,
      createdAt: true,
    },
  })

  const groupedByDate = new Map<string, DateGroup>()

  const startDate = fromDate ? new Date(fromDate) : null
  const endDate = toDate ? new Date(toDate) : null
  const groupByMonth = groupBy === "month"

  for (const transaction of checkoutTransactions) {
    const date = new Date(transaction.createdAt)

    if (startDate && date < startDate) continue
    if (endDate && date > endDate) continue

    const key = groupByMonth
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : date.toISOString().split("T")[0]

    if (!key) continue

    if (!groupedByDate.has(key)) {
      groupedByDate.set(key, {
        date: key,
        totalCases: 0,
        count: 0,
      })
    }

    const group = groupedByDate.get(key)!
    group.totalCases += transaction.quantity
    group.count += 1
  }

  const dailyData = Array.from(groupedByDate.values()).map(group => ({
    date: group.date,
    totalCases: group.totalCases,
    averageCases: group.count > 0 ? group.totalCases / group.count : 0,
  }))

  dailyData.sort((a, b) => a.date.localeCompare(b.date))

  const totalCases = dailyData.reduce((sum, day) => sum + day.totalCases, 0)
  const totalDays = dailyData.length
  const overallDailyAverage = totalDays > 0 ? totalCases / totalDays : 0

  return {
    dailyData,
    summary: {
      totalCasesCheckedOut: totalCases,
      totalDays,
      dailyAverage: Math.round(overallDailyAverage),
    },
  }
}
