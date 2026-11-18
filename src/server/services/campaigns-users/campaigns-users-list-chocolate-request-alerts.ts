import { and, eq } from "drizzle-orm"

import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import type { db } from "@/server/db"
import { campaignsUsers, casesTransactions, users } from "@/server/db/schema"

export type ChocolateRequestAlertUser = {
  userId: string
  fullName: string
  pin: string
}

export const campaignsUsersListChocolateRequestAlerts = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<ChocolateRequestAlertUser[]> => {
  const campaignsUsersResult = await database
    .select({
      userId: campaignsUsers.userId,
      requestedCaseTransactionAt: campaignsUsers.requestedCaseTransactionAt,
      fullName: users.fullName,
      pin: users.pin,
    })
    .from(campaignsUsers)
    .innerJoin(users, eq(campaignsUsers.userId, users.id))
    .where(eq(campaignsUsers.campaignId, input.campaignId))

  const casesCheckedOutResult = await database.query.casesTransactions.findMany({
    where: and(
      eq(casesTransactions.campaignId, input.campaignId),
      eq(casesTransactions.type, CasesTransactionsTypeEnum.CHECKOUT as string)
    ),
    columns: { userId: true, createdAt: true },
  })

  const lastCheckoutAtByUserId = new Map<string, Date>()
  for (const transaction of casesCheckedOutResult) {
    if (!transaction.createdAt || !transaction.userId) continue
    const current = lastCheckoutAtByUserId.get(transaction.userId)
    if (!current || transaction.createdAt > current) {
      lastCheckoutAtByUserId.set(transaction.userId, transaction.createdAt)
    }
  }

  return campaignsUsersResult
    .filter(campaignUser => {
      if (!campaignUser.requestedCaseTransactionAt) return false
      const lastCheckoutAt = lastCheckoutAtByUserId.get(campaignUser.userId)
      return !lastCheckoutAt || campaignUser.requestedCaseTransactionAt > lastCheckoutAt
    })
    .map(({ userId, fullName, pin }) => ({ userId, fullName: fullName ?? "", pin: pin ?? "" }))
}
