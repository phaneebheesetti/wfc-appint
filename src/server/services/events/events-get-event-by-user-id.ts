import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { events } from "@/server/db/schema"
import { campaignsGetCampaignsByUserId, campaignsGetEventsOverview } from "@/server/services/campaigns"
import { getCurrentEventLevel, getNextEventLevel } from "@/utils/events"

export const eventsGetEventByUserId = async ({
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

  const eventsOverview = await campaignsGetEventsOverview({
    database,
    input: { campaignId },
  })

  let eventId = null

  if (type === "current") {
    const currentEvent = getCurrentEventLevel({
      casesPaid: eventsOverview?.usersBalanceById[userId]?.casesPaid ?? 0,
      casesCheckedOut: eventsOverview?.usersBalanceById[userId]?.casesCheckedOut ?? 0,
      events: Object.values(eventsOverview?.eventsInfoById ?? {}),
    })
    eventId = currentEvent?.id ?? null
  } else {
    const nextEvent = getNextEventLevel({
      casesPaid: eventsOverview?.usersBalanceById[userId]?.casesPaid ?? 0,
      casesCheckedOut: eventsOverview?.usersBalanceById[userId]?.casesCheckedOut ?? 0,
      events: Object.values(eventsOverview?.eventsInfoById ?? {}),
    })
    eventId = nextEvent?.id ?? null
  }

  if (!eventId) return null

  const event = await database.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      campaign: true,
    },
  })

  return event
}
