"use client"

import { PageTitle } from "@/components/page-title"
import { ParentCampaignsList } from "@/components/parent/parent-campaigns-list"
import { ParticipantCampaignsList } from "@/components/participant/participant-campaigns-list"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"

export default function CampaignsPage() {
  const { loggedInUserId: userId, loggedInRole } = useLoggedInUser()

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Fundraisers"
        description="See all your fundraisers — what you're working on now and what you've already completed!"
      />

      {loggedInRole === RolesEnum.PARENT ? (
        <ParentCampaignsList userId={userId!} />
      ) : (
        <ParticipantCampaignsList userId={userId!} status={CampaignsStatusEnum.ACTIVE} />
      )}
    </div>
  )
}
