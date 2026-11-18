import { generateCsv, mkConfig } from "export-to-csv"

import { PRIZE_GOAL_TYPE_DETAILS, PrizeGoalTypeEnum } from "@/constants/prize"
import type { db } from "@/server/db"
import { campaignsGetPrizesOverview } from "@/server/services/campaigns"
import { getUserDisplayName } from "@/utils/users"

import { prizesListByCampaignId } from "./prizes-list-by-campaign-id"

export const prizesByCampaignIdCsv = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const prizesData = await prizesListByCampaignId({
    database,
    input,
  })

  if (!prizesData || prizesData.length === 0) {
    return null
  }

  const prizesStats = await campaignsGetPrizesOverview({
    database,
    input,
  })

  const copy = prizesData.map(prize => {
    const prizeId = prize.id
    const participantsEligible = prizesStats?.prizesInfoById[prizeId]?.participants?.eligibleCount ?? 0
    const prizeName = prize.name ?? ""
    const prizeDescription = prize.description ?? ""
    const prizeGoal = PRIZE_GOAL_TYPE_DETAILS[prize.goalType as PrizeGoalTypeEnum].label ?? ""
    const casesGoal = (prize.goalType as PrizeGoalTypeEnum) === PrizeGoalTypeEnum.CASE_PAYMENT ? prize.casesGoal : ""

    const prizeInfo = prizesStats?.prizesInfoById[prizeId]

    const participantNames = (prizeInfo?.participants?.eligible ?? [])
      .map(user => getUserDisplayName(user))
      .sort((a, b) => a.localeCompare(b))
      .join("; ")

    return {
      "Prize Name": prizeName,
      Description: prizeDescription,
      "Prize Goal": prizeGoal,
      "Cases Goal": casesGoal,
      "Participants Eligible": participantsEligible,
      Active: prize.active,
      Participants: participantNames,
    }
  })

  return generateCsv(
    mkConfig({
      filename: `campaign-prizes`,
      useKeysAsHeaders: true,
    })
  )(copy)
}
