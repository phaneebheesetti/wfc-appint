"use client"

import { useRouter } from "next/navigation"

import { HowToVideoButton } from "@/components/how-to-video-button"
import { Button } from "@/components/ui/button"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { type Campaign, type DigitalSalesDetails, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

import { EnableSalesPageCard } from "./enable-sales-page-card"
import { InventoryCard } from "./inventory-card"
import { PersonalMessageCard } from "./personal-message-card"

const SALES_PAGE_HOW_TO_VIDEO_URL = "/parent-onboarding-videos/digital-sales-page.mp4"

interface DigitalSalesCardProps {
  user: User
  campaign: Campaign
}

export function DigitalSalesCard({ user, campaign }: DigitalSalesCardProps) {
  const router = useRouter()
  const { loggedInRole } = useLoggedInUser()

  // Global feature flag (whole feature on/off) + parent-only actor.
  const isEnabled = loggedInRole === RolesEnum.PARENT && env.NEXT_PUBLIC_DIGITAL_SALES_ENABLED === "true"

  const { data: salesInfo } = api.digitalSalesInformation.getByParticipantAndFundraiser.useQuery(
    { participantId: user.id, fundraiserId: campaign.id },
    { enabled: isEnabled && !!campaign.id && !!user.id }
  )

  if (!isEnabled) return null

  const details: DigitalSalesDetails = salesInfo?.digitalSalesDetails ?? {}

  const messageDone = !!details.personal_message?.created_at
  const inventoryDone = !!details.inventory_details?.marked_done
  const enableDone = !!details.enable_sales_page?.created_at
  const salesPageEnabled = !!details.enable_sales_page?.is_active

  const setUpCompleted = messageDone && inventoryDone && enableDone

  const rows = [
    { label: "Add Personal Message", done: messageDone },
    { label: "Add Inventory", done: inventoryDone },
    { label: "Share Your Fundraiser", done: enableDone },
  ]
  const remaining = rows.filter(row => !row.done).length

  const goToSetup = () => router.push(`/dashboard/campaigns/${campaign.id}/sales-page?userId=${user.id}`)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="text-[22px] font-bold text-foreground">Digital Sales</div>
          <span className="rounded-full bg-[#efe6d2] px-2.5 py-0.5 text-[11px] font-bold text-primary">New</span>
        </div>
        {!salesPageEnabled && (
          <p className="text-muted-foreground">
            Once enabled, friends and family can buy online for you to deliver to them in-person.
          </p>
        )}
      </div>

      {!setUpCompleted && (
        <div className="rounded-card border bg-card p-5 shadow-elev-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[17px] font-bold text-foreground">Set Up Your Personal Sales Page</div>
              <div className="text-sm text-muted-foreground">
                Complete {remaining} required step{remaining === 1 ? "" : "s"} before you can share
              </div>
            </div>

            <HowToVideoButton title="Set Up Your Personal Sales Page" videoUrl={SALES_PAGE_HOW_TO_VIDEO_URL} />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {rows.map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm font-medium">{row.label}</span>
                <span className={cn("text-sm font-semibold", row.done ? "text-success" : "text-muted-foreground")}>
                  {row.done ? "Done" : "Not Started"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-center">
            <Button variant="accent" className="w-full sm:w-auto sm:px-10" onClick={goToSetup}>
              Set Up Your Personal Sales Page
            </Button>
          </div>
        </div>
      )}
      {/* individual sections displayed as progressed */}
      {messageDone && inventoryDone && (
        <EnableSalesPageCard fundraiserId={campaign.id} participantId={user.id} details={details} />
      )}

      {messageDone && <PersonalMessageCard fundraiserId={campaign.id} participantId={user.id} details={details} />}

      {inventoryDone && (
        <InventoryCard
          fundraiserId={campaign.id}
          participantId={user.id}
          inventoryDetails={details.inventory_details}
        />
      )}
    </div>
  )
}
