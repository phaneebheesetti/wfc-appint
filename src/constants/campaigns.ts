import { CheckCircleIcon, type LucideIcon, XCircleIcon } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum FcAccessRevocationReasonEnum {
  ORG_ADMIN_REVOKED = "Revoked by Org Admin",
  FC_REASSIGNED = "Fundraising Consultant Reassigned",
  FUNDRAISER_CLOSED = "Fundraiser Closed",
  FUNDRAISER_DELETED = "Fundraiser Deleted",
  EXPIRED = "Access Expired",
}

export enum CampaignsStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ENDED = "ended",
  CANCELLED = "cancelled",
}

export enum CampaignsVisibilityEnum {
  PUBLISHED = "published",
  DRAFT = "draft",
}

export enum CampaignTransactionEnum {
  PAYMENT = "payment",
  CHECKOUT = "checkout",
}

export const CAMPAIGN_STATUS_DETAILS: Record<
  CampaignsStatusEnum,
  { label: string; icon: LucideIcon; color: ColorEnum }
> = {
  [CampaignsStatusEnum.ACTIVE]: {
    label: "Active",
    icon: CheckCircleIcon,
    color: ColorEnum.GREEN,
  },
  [CampaignsStatusEnum.INACTIVE]: {
    label: "Inactive",
    icon: CheckCircleIcon,
    color: ColorEnum.MUTED,
  },
  [CampaignsStatusEnum.ENDED]: {
    label: "Closed",
    icon: CheckCircleIcon,
    color: ColorEnum.RED,
  },
  [CampaignsStatusEnum.CANCELLED]: {
    label: "Cancelled",
    icon: XCircleIcon,
    color: ColorEnum.RED,
  },
}
