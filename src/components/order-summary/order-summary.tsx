"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"

import { NotFound } from "@/components/not-found"
import { Skeleton } from "@/components/ui/skeleton"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { OrderFundsBanner } from "./order-funds-banner"
import { OrderList } from "./order-list"

export function OrderSummary() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")

  const { loggedInUserId, loggedInRole, isLoading: isLoggedInUserLoading } = useLoggedInUser()
  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId

  const { data: user, isLoading: isUserLoading } = api.users.getById.useQuery(
    { id: userIdToUse! },
    { enabled: !!userIdToUse }
  )

  const { data: campaign } = api.campaigns.getById.useQuery({ id: campaignId }, { enabled: !!campaignId })

  const { data: salesInfo, isLoading: isSalesLoading } =
    api.digitalSalesInformation.getByParticipantAndFundraiser.useQuery(
      { participantId: userIdToUse!, fundraiserId: campaignId },
      { enabled: !!userIdToUse && !!campaignId }
    )

  const digitalSalesId = salesInfo?.id

  const { data: orderSummary, isLoading: isOrderSummaryLoading } =
    api.consumerPaymentLogs.getOrderSummaryByDigitalSalesId.useQuery(
      { digitalSalesId: digitalSalesId! },
      { enabled: !!digitalSalesId }
    )

  const fundraiserBackHref = `/dashboard/campaigns/${campaignId}${userId ? `?userId=${userId}` : ""}`

  if (isUserLoading || isLoggedInUserLoading || isSalesLoading || isOrderSummaryLoading) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!user) return <NotFound />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <Link href={fundraiserBackHref} className="mt-1" aria-label="Back">
          <ChevronLeft />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Order Summary</h2>
          <p className="text-sm text-muted-foreground">
            {user.fullName}
            {user.pin ? ` · ${user.pin}` : ""}
          </p>
        </div>
      </div>

      <OrderFundsBanner
        cardAmountCents={orderSummary?.cardAmountCents ?? 0}
        cashAmountCents={orderSummary?.cashAmountCents ?? 0}
        totalAmountCents={orderSummary?.totalAmountCents ?? 0}
      />

      {userIdToUse && digitalSalesId && (
        <OrderList
          participantId={userIdToUse}
          fundraiserId={campaignId}
          participantFirstName={user.firstName ?? ""}
          participantName={user.fullName ?? ""}
          organizationName={campaign?.organization?.name ?? ""}
          fundraiserName={campaign?.name ?? ""}
        />
      )}
    </div>
  )
}
