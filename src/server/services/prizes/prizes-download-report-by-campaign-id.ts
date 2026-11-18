import type { db } from "@/server/db"
import { campaignsGetPrizesOverview } from "@/server/services/campaigns/get-prizes-overview"
import { getPrizesReport } from "@/utils/prizes"

export const prizesDownloadReportByCampaignId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: { campaignId: string }
  maskParticipantPii?: boolean
}) => {
  const prizesOverview = await campaignsGetPrizesOverview({
    database,
    input,
  })

  return getPrizesReport({ prizesOverview, maskParticipantPii })
}
