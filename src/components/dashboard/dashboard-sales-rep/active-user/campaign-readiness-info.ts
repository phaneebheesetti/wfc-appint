import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import { type Campaign, type Organization } from "@/server/db/schema"

export const getReadinessInfo = ({
  organization,
  campaign,
  hasPrizes,
}: {
  organization: Organization | null
  campaign: Campaign | null
  hasPrizes: boolean
}) => {
  const hasInventory = (campaign?.casesTransactions?.length ?? 0) > 0
  const isPublished = campaign?.visibility === OrganizationsVisibilityEnum.PUBLISHED
  const checks = [
    !!organization,
    !!campaign,
    !!hasInventory,
    !!campaign?.digitalPayment,
    hasPrizes,
    !!campaign?.sponsorId,
  ]

  const completedChecks = checks.filter(Boolean).length
  const readinessPercent = isPublished ? 100 : Math.round((completedChecks / checks.length) * 100)

  const missingItems = []
  const nextBestItem = []

  if (!isPublished) {
    if (!campaign) {
      missingItems.push("Create Fundraiser")
      nextBestItem.push("does not have any fundraiser.")
    }
    if (!hasInventory) {
      missingItems.push("Inventory Setup")
      nextBestItem.push("needs Inventory setup. This is currently blocking 1 of your fundraisers.")
    }
    if (!hasPrizes) {
      missingItems.push("Prize Program")
      nextBestItem.push("needs a Prize Program. This is currently blocking 1 of your fundraisers.")
    }
    if (!campaign?.digitalPayment) {
      missingItems.push("Digital Payment Setup")
      nextBestItem.push("needs the digital payment setup. This is currently blocking 1 of your fundraisers.")
    }
    if (!campaign?.sponsorId) {
      missingItems.push("Invite Sponsor")
      nextBestItem.push("needs a sponsor assigned. This is currently blocking 1 of your fundraisers.")
    }
  }

  let readinessColor = "bg-red-500"
  let readinessText = "Needs Attention"
  let readinessTextColor = "text-red-500"

  if (readinessPercent === 100) {
    readinessColor = "bg-green-500"
    readinessText = "Ready"
    readinessTextColor = "text-success"
  } else if (readinessPercent > 50) {
    readinessColor = "bg-orange-500"
    readinessText = "Almost Ready"
    readinessTextColor = "text-warning"
  } else {
    readinessColor = "bg-red-500"
    readinessText = "Needs Attention"
    readinessTextColor = "text-destructive"
  }
  const totalMissingCount = missingItems.length
  const visibleMissingItems = missingItems.slice(0, 3)
  const extraMissingCount = Math.max(0, missingItems.length - 3)

  return {
    readinessPercent,
    readinessColor,
    readinessText,
    readinessTextColor,
    totalMissingCount,
    missingItems: visibleMissingItems,
    extraMissingCount,
    nextBestItem,
  }
}
