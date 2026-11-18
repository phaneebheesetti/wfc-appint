import Image from "next/image"

import { Card } from "@/components/ui/card"

import { ParticipantDashboardSectionTitle } from "./participant-dashboard-section-title"

const BADGES = [
  {
    id: "first-campaign",
    title: "Completed First Fundraiser",
    image: "/participant/badge-first-campaign.png",
  },
  {
    id: "first-case-checked-out",
    title: "First Case Checked Out",
    image: "/participant/badge-first-case-checked-out.png",
  },
]

export function ParticipantDashboardBadges() {
  return (
    <div className="flex flex-col gap-4">
      <ParticipantDashboardSectionTitle
        title="Your Badges"
        description="Look how far you’ve come!"
        viewAllRoute="/dashboard/badges"
      />

      <div className="flex gap-2.5">
        {BADGES.map(badge => (
          <Card key={badge.id} className="py-6 px-4 flex flex-col gap-2 items-center w-full text-center">
            <Image src={badge.image} alt={badge.title} width={108} height={108} />
            <div className="text-sm text-muted-foreground">{badge.title}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
