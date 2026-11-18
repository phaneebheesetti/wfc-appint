import { CampaignFcAccess } from "@/components/campaigns/campaign-fc-access"
import { FieldText } from "@/components/ui/text"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type Campaign } from "@/server/db/schema"
import { formatDate } from "@/utils/date"
import { getUserDisplayName } from "@/utils/users"

interface CampaignsViewProps {
  campaign: Campaign
}

export function CampaignsView({ campaign }: CampaignsViewProps) {
  const { loggedInRole: role } = useLoggedInUser()

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Campaign ID" value={campaign.id} adminOnly />
      <FieldText label="Organization ID" value={campaign.organizationId} adminOnly />
      <FieldText label="Name" value={campaign.name} />
      <FieldText label="Start Date" value={formatDate(campaign.startDate)} />
      <FieldText label="End Date" value={formatDate(campaign.endDate)} />
      <FieldText label="Digital Payment" value={campaign.digitalPayment ? "Yes" : "No"} />
      <FieldText label="Status" value={campaign.status} />
      <FieldText
        label="Sponsor"
        value={
          <>
            <div>{getUserDisplayName(campaign.sponsor)}</div>
            <div className="text-xs text-muted-foreground">{campaign.sponsor?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Sponsor ID" value={campaign.sponsor?.id} adminOnly />
      <FieldText
        label="Created By"
        value={
          <>
            <div>{getUserDisplayName(campaign.createdByUser)}</div>
            <div className="text-xs text-muted-foreground">{campaign.createdByUser?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Created By ID" value={campaign.createdByUser?.id} adminOnly />

      {role === RolesEnum.ORGANIZATION_ADMIN && <CampaignFcAccess campaign={campaign} />}
    </div>
  )
}
