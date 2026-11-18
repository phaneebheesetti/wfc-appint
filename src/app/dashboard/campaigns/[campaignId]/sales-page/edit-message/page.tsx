"use client"

import { ChevronLeft } from "lucide-react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { SalesPageMessageEditor } from "@/components/campaigns/campaign-dashboard/digital-sales/sales-page-message-editor"
import { NotFound } from "@/components/not-found"
import { Skeleton } from "@/components/ui/skeleton"
import { RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { type DigitalSalesDetails } from "@/server/db/schema"
import { api } from "@/trpc/react"

export default function EditMessagePage() {
  const router = useRouter()
  const { campaignId } = useParams<{ campaignId: string }>()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")
  const { loggedInUserId, loggedInRole, isLoading: isLoggedInUserLoading } = useLoggedInUser()
  const isEnabled = loggedInRole === RolesEnum.PARENT && env.NEXT_PUBLIC_DIGITAL_SALES_ENABLED === "true"

  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId
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
  if (!isEnabled || !user || !campaign) return <NotFound />

  const details: DigitalSalesDetails = salesInfo?.digitalSalesDetails ?? {}
  const firstName = user.firstName ?? ""

  const title = "Edit Personal Message"
  const subtitle = `Shown at the top of ${firstName || "your participant"}'s sales page`

  if (isCampaignLoading || isUserLoading || isLoggedInUserLoading || (isEnabled && isSalesLoading)) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => router.back()} className="mt-1" aria-label="Back">
          <ChevronLeft />
        </button>

        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <SalesPageMessageEditor
        fundraiserId={campaignId}
        participantId={user.id}
        participantFirstName={firstName}
        fundraiserName={campaign.name}
        initialMessage={details.personal_message?.message ?? ""}
        organizationName={campaign.organization.name ?? ""}
        onBack={() => router.back()}
      />
    </div>
  )
}
