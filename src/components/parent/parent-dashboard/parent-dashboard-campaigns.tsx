import { CreditCard, Eye, PackagePlus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { AVATARS } from "@/constants/avatars"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { toastError } from "@/utils/errors"
import { getDigitFromFirstChar } from "@/utils/string"

export const ParentDashboardCampaigns = () => {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const utils = api.useUtils()

  const [sendRequestChocolateLoading, setSendRequestChocolateLoading] = useState(false)

  const { data: userCampaigns = [], isLoading: isLoadingCampaigns } =
    api.casesTransactions.getUserCampaignsByParentId.useQuery(
      { parentId: loggedInUserId! },
      { enabled: !!loggedInUserId }
    )

  const { data: enrolledWithoutCheckouts = [], isLoading: isLoadingEnrolled } =
    api.campaignsUsers.listWithoutCheckoutByParentId.useQuery(
      { parentId: loggedInUserId! },
      { enabled: !!loggedInUserId }
    )

  const { mutateAsync: createManyChannelMessages } = api.channelMessages.createMany.useMutation()
  const { mutateAsync: updateCampaignUser } = api.campaignsUsers.update.useMutation()

  const handlePaymentClick = (userPin: string | null) => {
    if (!userPin) {
      toast.warning("Payment not available - user PIN not found")
      return
    }

    if (!loggedInUserId) {
      toast.warning("Unable to identify the logged-in parent")
      return
    }

    const searchParams = new URLSearchParams({
      pin: userPin,
      parentId: loggedInUserId,
    })

    window.open(`/payment?${searchParams.toString()}`, "_blank")
  }

  const handleRequestChocolateClick = async ({
    userId,
    campaignUserId,
    organizationId,
  }: {
    userId: string
    campaignUserId: string
    organizationId: string
  }) => {
    try {
      if (!loggedInUserId) {
        throw new Error("Failed to request chocolate. Please contact support.")
      }

      setSendRequestChocolateLoading(true)

      const organizationAdmin = await utils.organizationsUsers.getAdmin.fetch({ organizationId: organizationId })
      if (!organizationAdmin) {
        throw new Error("Failed to request chocolate: No admin found for this organization. Please contact support.")
      }

      const response = await fetch("/api/email/send/request-chocolate", {
        method: "POST",
        body: JSON.stringify({
          to: organizationAdmin?.email,
          fundraisingManagerName: organizationAdmin?.fullName ?? "",
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to request chocolate: email not sent. Please contact support.")
      }

      const userChannels = await utils.channels.listByUserId.fetch({ userId })
      if (!userChannels || userChannels.length === 0) {
        throw new Error("Failed to request chocolate: in-app message not sent. Please contact support.")
      }

      await createManyChannelMessages({
        channelIds: userChannels.map(channel => channel.id),
        content: "Great news! I'm ready to check out another case of chocolate. Head to the app to fulfill my request!",
        userId,
      })

      await updateCampaignUser({
        id: campaignUserId,
        requestedCaseTransactionAt: new Date(),
      })

      toast.success(
        "An in-app message & email have been sent to the organization admin requesting a chocolate case for this participant."
      )
    } catch (error) {
      toastError({ error, fallbackMessage: "Failed to request chocolate. Please contact support." })
    } finally {
      setSendRequestChocolateLoading(false)
    }
  }

  const isLoading = isLoadingCampaigns ?? isLoadingEnrolled

  if (isLoading) {
    return <Skeleton className="w-full h-48 rounded-xl" />
  }

  const hasActiveCampaigns = userCampaigns && userCampaigns.length > 0
  const hasEnrolledWithoutCheckouts = enrolledWithoutCheckouts && enrolledWithoutCheckouts.length > 0

  if (!hasActiveCampaigns && !hasEnrolledWithoutCheckouts) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Family Active Fundraisers</h1>
        <div className="flex flex-col gap-4 p-4 bg-accent rounded-xl border-0">
          <div className="text-center text-muted-foreground">
            <p>No active fundraisers found</p>
            <p className="text-sm">Fundraisers will appear here when family members are enrolled in fundraisers.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Family Active Fundraisers</h1>

      {/* Campaigns with checkouts */}
      {userCampaigns?.map(userCampaign => (
        <div
          key={`${userCampaign.userId}-${userCampaign.campaignId}`}
          className="flex flex-col gap-4 p-4 bg-accent rounded-xl border-0"
        >
          <div className="flex flex-row items-center gap-2">
            <div className="h-12 w-12">
              <Image
                src={AVATARS[getDigitFromFirstChar(userCampaign?.userId)] ?? ""}
                alt="User Avatar"
                width={88}
                height={88}
              />
            </div>
            <p className="text-sm font-medium">{userCampaign.userFullName}</p>
          </div>

          <div className="flex justify-between items-center font-semibold">
            {userCampaign.campaignName}

            <Link
              href={
                loggedInRole === RolesEnum.PARENT
                  ? `/dashboard/campaigns/${userCampaign.campaignId}?userId=${userCampaign.userId}`
                  : `/dashboard/campaigns/${userCampaign.campaignId}`
              }
            >
              <Button variant="outline">
                <Eye />
                View
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="text-3xl font-semibold">{userCampaign.progress}%</div>
              <Progress value={userCampaign.progress} className="w-full bg-input [&>*]:bg-brown-500" showPercentage />
            </div>
            <div className="text-xs font-light">
              {userCampaign.totalCasesCheckedOutByCampaign} of {userCampaign.campaignCasesGoal} chocolate case
              {userCampaign.campaignCasesGoal !== 1 ? "s" : ""} goal
            </div>
          </div>

          <div className="w-full h-px bg-gray-200" />

          <div className="flex flex-col gap-1">
            <div className="text-sm font-light">{userCampaign.organizationName}</div>
            <div className="text-sm font-light text-muted-foreground">
              {userCampaign.totalCasesCheckedOutByUser} case{userCampaign.totalCasesCheckedOutByUser !== 1 ? "s" : ""}{" "}
              checked out by {userCampaign.userFullName}
            </div>
          </div>

          {userCampaign.campaignDigitalPayment && (
            <Button
              className="w-full justify-between"
              onClick={() => handlePaymentClick(userCampaign.userPin)}
              disabled={!userCampaign.userPin}
            >
              Pay for case
              <CreditCard />
            </Button>
          )}

          <div>
            <Button
              onClick={() =>
                handleRequestChocolateClick({
                  ...userCampaign,
                })
              }
              disabled={sendRequestChocolateLoading}
            >
              <PackagePlus />
              {sendRequestChocolateLoading ? "Requesting..." : "Request Chocolate"}
            </Button>
          </div>
        </div>
      ))}

      {enrolledWithoutCheckouts?.map(enrollment => (
        <div
          key={`${enrollment.userId}-${enrollment.campaignId}`}
          className="flex flex-col gap-4 p-4 bg-accent rounded-xl border-0"
        >
          <div className="flex flex-row items-center gap-2 cursor-pointer">
            <div className="h-12 w-12">
              <Image
                src={AVATARS[getDigitFromFirstChar(enrollment?.userId)] ?? ""}
                alt="User Avatar"
                width={88}
                height={88}
              />
            </div>
            <p className="text-sm font-medium">{enrollment.userFullName}</p>
          </div>

          <div className="flex justify-between items-center font-semibold">
            {enrollment.campaignName}

            <Link href={`/dashboard/campaigns/${enrollment.campaignId}?userId=${enrollment.userId}`}>
              <Button variant="outline">
                <Eye />
                View
              </Button>
            </Link>
          </div>

          {enrollment.permissionSlipSignedAt && (
            <Card className="bg-accent p-4">
              <div className="flex flex-row gap-2">
                <div>
                  <Image
                    src="/participant/chocolate-case-ready.png"
                    alt="Chocolate permission Slip"
                    width={300}
                    height={279}
                  />
                </div>
                <div className="flex flex-col gap-4 pt-4">
                  <div className="text-lg font-semibold">Your Chocolate case is ready to go</div>
                  <div className="text-sm font-light">
                    Thats right! Go to your organization to get your case and earn your prizes!
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="w-full h-px bg-gray-200" />
          <div className="flex flex-col gap-1">
            <div className="text-sm font-light">{enrollment.organizationName}</div>
            <div className="text-sm font-light text-muted-foreground">
              Goal: {enrollment.campaignCasesGoal} chocolate case{enrollment.campaignCasesGoal !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
