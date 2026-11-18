import { FieldText } from "@/components/ui/text"
import { useLoggedInUser } from "@/hooks"
import { type CampaignAnnouncement } from "@/server/db/schema"
import { formatDate } from "@/utils/date"
import { getUserDisplayName } from "@/utils/users"

interface CampaignAnnouncementsViewProps {
  campaignAnnouncement: CampaignAnnouncement
}

export function CampaignAnnouncementsView({ campaignAnnouncement }: CampaignAnnouncementsViewProps) {
  const { loggedInRole: role } = useLoggedInUser()
  if (!role) return null

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Campaign Announcement ID" value={campaignAnnouncement.id} adminOnly />
      <FieldText label="Campaign ID" value={campaignAnnouncement.campaignId} adminOnly />

      <FieldText label="Title" value={campaignAnnouncement.title} />

      <FieldText label="Content" allowCopy={false} value={" "} />

      <div
        className="border border-secondary p-2 rounded-card prose"
        dangerouslySetInnerHTML={{
          __html: campaignAnnouncement.content ?? "",
        }}
      />

      <FieldText label="Type" value={campaignAnnouncement.type} />

      <FieldText label="Status" value={campaignAnnouncement.status} />

      <FieldText label="Reach" value={campaignAnnouncement.reach ?? 0} />

      <FieldText label="Date" value={formatDate(campaignAnnouncement.createdAt)} />

      <FieldText
        label="Created By"
        value={
          <>
            <div>{getUserDisplayName(campaignAnnouncement.createdByUser)}</div>
            <div className="text-xs text-muted-foreground">{campaignAnnouncement.createdByUser?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Created By ID" value={campaignAnnouncement.createdByUserId} adminOnly />
    </div>
  )
}
