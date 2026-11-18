import { type NextRequest, NextResponse } from "next/server"

import { RolesEnum } from "@/constants/roles"
import { type SupabaseCampaignUser, type SupabaseUser, createServiceClient } from "@/lib/supabase/service-client"
import { withSentry } from "@/utils/api"

interface CampaignUserWithUser extends SupabaseCampaignUser {
  users: SupabaseUser | null
}

export const GET = withSentry(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const campaignId = searchParams.get("campaignId")
  const organizationId = searchParams.get("organizationId")

  if (!campaignId || !organizationId) {
    return NextResponse.json({ error: "Missing required parameters: campaignId and organizationId" }, { status: 400 })
  }

  const supabaseServiceClient = createServiceClient()

  const { data, error } = await supabaseServiceClient
    .from("campaigns_users")
    .select(
      `
        *,
        users (*)
      `
    )
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const participantUsers = (data as CampaignUserWithUser[])
    .filter(cu => cu.users !== null && cu.users.role === RolesEnum.PARTICIPANT)
    .map(cu => cu.users)

  return NextResponse.json({ data: participantUsers }, { status: 200 })
})
