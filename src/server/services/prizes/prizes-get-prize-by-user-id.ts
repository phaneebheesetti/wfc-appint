import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { prizes } from "@/server/db/schema"
import { campaignsGetCampaignsByUserId, campaignsGetPrizesOverview } from "@/server/services/campaigns"
import { getCurrentPrizeLevel, getNextPrizeLevel } from "@/utils/prizes"

export const prizesGetPrizeByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; campaignId?: string; type?: "current" | "next" }
}) => {
  const { userId, campaignId: inputCampaignId, type = "current" } = input
  let campaignId = inputCampaignId

  if (!campaignId) {
    const campaigns = await campaignsGetCampaignsByUserId({ database, input: { userId } })

    const lastCampaign = campaigns[0]
    if (!lastCampaign) return null

    campaignId = lastCampaign.id
  }

  const prizesOverview = await campaignsGetPrizesOverview({
    database,
    input: { campaignId },
  })

  let prizeId = null

  if (type === "current") {
    const currentPrize = getCurrentPrizeLevel({
      casesPaid: prizesOverview?.usersBalanceById[userId]?.casesPaid ?? 0,
      casesCheckedOut: prizesOverview?.usersBalanceById[userId]?.casesCheckedOut ?? 0,
      prizes: Object.values(prizesOverview?.prizesInfoById ?? {}),
    })
    prizeId = currentPrize?.id ?? null
  } else {
    const nextPrize = getNextPrizeLevel({
      casesPaid: prizesOverview?.usersBalanceById[userId]?.casesPaid ?? 0,
      casesCheckedOut: prizesOverview?.usersBalanceById[userId]?.casesCheckedOut ?? 0,
      prizes: Object.values(prizesOverview?.prizesInfoById ?? {}),
    })
    prizeId = nextPrize?.id ?? null
  }

  if (!prizeId) return null

  const prize = await database.query.prizes.findFirst({
    where: eq(prizes.id, prizeId),
    with: {
      campaign: true,
    },
  })

  return prize
}
