import { type Campaign, type User } from "@/server/db/schema"

import { CampaignEvents } from "./campaign-events"
import { CampaignPrizes } from "./campaign-prizes"
import { CampaignPrizesEventsStats } from "./campaign-prizes-events-stats"

interface CampaignPrizesEventsProps {
  user: User
  campaign: Campaign
}

export function CampaignPrizesEvents({ user, campaign }: CampaignPrizesEventsProps) {
  return (
    <div className="flex flex-col gap-4">
      <CampaignPrizesEventsStats user={user} campaign={campaign} />
      <CampaignPrizes user={user} campaign={campaign} />
      <CampaignEvents user={user} campaign={campaign} />
    </div>
  )
}
