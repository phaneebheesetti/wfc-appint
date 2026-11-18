import { inArray } from "drizzle-orm"

import type { db } from "@/server/db"
import { events } from "@/server/db/schema"
import { campaignsGetCampaignsByUserId, campaignsGetParticipantsByEvent } from "@/server/services/campaigns"

export const eventsListByUserId = async ({ database, input }: { database: typeof db; input: { userId: string } }) => {
  const campaigns = await campaignsGetCampaignsByUserId({ database, input: { userId: input.userId } })

  const participantsByEvent = await Promise.all(
    campaigns.map(campaign =>
      campaignsGetParticipantsByEvent({
        database,
        input: { campaignId: campaign.id },
      })
    )
  )

  const eventsIds = participantsByEvent
    .map(participantsByEvent => {
      const eventTiers = Object.values(participantsByEvent?.eventTiers ?? {})

      const eventTier = eventTiers.find(eventTier => eventTier.participantIds.includes(input.userId))

      return eventTier?.id ?? null
    })
    .filter((id): id is string => id !== null && id !== undefined)

  const eventsData = await database.query.events.findMany({
    where: inArray(events.id, eventsIds),
  })

  return eventsData
}
