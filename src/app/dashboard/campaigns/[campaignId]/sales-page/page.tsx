"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useState } from "react"

import { SalesPageMessageEditor } from "@/components/campaigns/campaign-dashboard/digital-sales/sales-page-message-editor"
import { SalesPageSteps } from "@/components/campaigns/campaign-dashboard/digital-sales/sales-page-steps"
import { NotFound } from "@/components/not-found"
import { Skeleton } from "@/components/ui/skeleton"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { type DigitalSalesDetails } from "@/server/db/schema"
import { api } from "@/trpc/react"

type SetupView = "steps" | "message"

export default function SalesPageSetupPage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const { loggedInUserId, loggedInRole, isLoading: isLoggedInUserLoading } = useLoggedInUser()
  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId
  const [view, setView] = useState<SetupView>("steps")

  const isEnabled = loggedInRole === RolesEnum.PARENT && env.NEXT_PUBLIC_DIGITAL_SALES_ENABLED === "true"

  const { data: campaign, isLoading: isCampaignLoading } = api.campaigns.getById.useQuery({ id: campaignId })
  const { data: user, isLoading: isUserLoading } = api.users.getById.useQuery(
    { id: userIdToUse! },
    { enabled: !!userIdToUse }
  )
  const { data: salesInfo, isLoading: isSalesLoading } =
    api.digitalSalesInformation.getByParticipantAndFundraiser.useQuery(
      { participantId: userIdToUse!, fundraiserId: campaignId },
      { enabled: isEnabled && !!userIdToUse && !!campaignId }
    )

  if (isCampaignLoading || isUserLoading || isLoggedInUserLoading || (isEnabled && isSalesLoading)) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!isEnabled || !user || !campaign) return <NotFound />

  const details: DigitalSalesDetails = salesInfo?.digitalSalesDetails ?? {}
  const messageDone = !!details.personal_message?.created_at
  const firstName = user.firstName ?? ""
  const fundraiserBackHref = `/dashboard/campaigns/${campaignId}${userId ? `?userId=${userId}` : ""}`

  const messageEditorTitle = messageDone ? "Edit Personal Message" : "Add Personal Message"
  const title = view === "message" ? messageEditorTitle : "Set Up Your Personal Sales Page"
  const subtitle =
    view === "message"
      ? `Shown at the top of ${firstName || "your participant"}'s sales page`
      : "Take orders online for in-person delivery"

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex items-start gap-2">
        {view === "message" ? (
          <button type="button" onClick={() => setView("steps")} className="mt-1" aria-label="Back">
            <ChevronLeft />
          </button>
        ) : (
          <Link href={fundraiserBackHref} className="mt-1" aria-label="Back">
            <ChevronLeft />
          </Link>
        )}
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {view === "steps" ? (
        <SalesPageSteps
          fundraiserId={campaignId}
          participantId={user.id}
          details={details}
          onEditMessage={() => setView("message")}
        />
      ) : (
        <SalesPageMessageEditor
          fundraiserId={campaignId}
          participantId={user.id}
          participantFirstName={firstName}
          fundraiserName={campaign.name}
          initialMessage={details.personal_message?.message ?? ""}
          organizationName={campaign.organization.name ?? ""}
          onBack={() => setView("steps")}
        />
      )}
    </div>
  )
}
