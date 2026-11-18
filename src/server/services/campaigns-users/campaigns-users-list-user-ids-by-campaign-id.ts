import { eq } from "drizzle-orm"

import { type db } from "@/server/db"
import { campaignsUsers, organizationsUsers, users } from "@/server/db/schema"

import {
  type CampaignsUsersFilterInput,
  buildCampaignsUsersWhereClause,
  organizationsUsersJoinCondition,
  parentUsersAlias,
} from "./campaigns-users-filter-clause"

export const campaignsUsersListUserIdsByCampaignId = async ({
  database,
  input,
}: {
  database: typeof db
  input: CampaignsUsersFilterInput
}) => {
  const campaignUsers = await database
    .select({ id: campaignsUsers.id, userId: campaignsUsers.userId })
    .from(campaignsUsers)
    .innerJoin(users, eq(campaignsUsers.userId, users.id))
    .leftJoin(parentUsersAlias, eq(users.parentUserId, parentUsersAlias.id))
    .innerJoin(organizationsUsers, organizationsUsersJoinCondition(input.organizationId))
    .where(buildCampaignsUsersWhereClause(input))

  return campaignUsers
}
