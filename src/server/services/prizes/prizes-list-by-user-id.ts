import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { prizes } from "@/server/db/schema"
import { campaignsGetCampaignsByUserId, campaignsGetPrizesOverview } from "@/server/services/campaigns"

export const prizesListByUserId = async ({ database, input }: { database: typeof db; input: { userId: string } }) => {
  const campaigns = await campaignsGetCampaignsByUserId({ database, input: { userId: input.userId } })
  if (campaigns.length === 0) return []

  const prizesOverview = await Promise.all(
    campaigns.map(campaign =>
      campaignsGetPrizesOverview({
        database,
        input: { campaignId: campaign.id },
      })
    )
  )

  const prizesIds = prizesOverview
    .map(prizesOverview => {
      const prizesInfo = Object.values(prizesOverview?.prizesInfoById ?? {})

      const prizeInfo = prizesInfo.find(prizeInfo => prizeInfo.participants.eligibleIds.includes(input.userId))

      return prizeInfo?.id ?? null
    })
    .filter((id): id is string => id !== null && id !== undefined)

  const prizesData = await database.query.prizes.findMany({
    where: inArray(prizes.id, prizesIds),
  })

  return prizesData
}
