import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaigns, campaignsUsers } from "@/server/db/schema"

export const campaignsUsersCreate = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; campaignId: string; userId: string }
}) => {
  const campaign = await database.query.campaigns.findFirst({
    where: eq(campaigns.id, input.campaignId),
  })
  if (!campaign || campaign.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot add users to a fundraiser after its closed." })
  }

  const [createdCampaignUser] = await database
    .insert(campaignsUsers)
    .values({
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      userId: input.userId,
    })
    .returning()
  if (!createdCampaignUser) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create fundraiser user." })
  }

  return createdCampaignUser ?? null
}
