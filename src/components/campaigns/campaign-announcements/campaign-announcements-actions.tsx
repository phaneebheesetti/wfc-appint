import { useState } from "react"

import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CampaignAnnouncement } from "@/server/db/schema"

import { CampaignAnnouncementsView } from "./campaign-announcements-view"

interface CampaignAnnouncementsActionsProps {
  campaignAnnouncement: CampaignAnnouncement
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Actions = "view" | "update"

export function CampaignAnnouncementsActions({
  campaignAnnouncement,
  open,
  onOpenChange,
}: CampaignAnnouncementsActionsProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const [action] = useState<Actions>("view")

  if (!role) return null

  return (
    <SheetSimple open={open} onOpenChange={onOpenChange} title={campaignAnnouncement.title} description="Announcement">
      {action !== "update" && <CampaignAnnouncementsView campaignAnnouncement={campaignAnnouncement} />}
    </SheetSimple>
  )
}
