import { CheckCircle, CircleX, Laptop, type LucideIcon, Mail, MessageSquare } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum CampaignAnnouncementTypeEnum {
  SMS = "sms",
  EMAIL = "email",
  APP = "app",
}

export enum CampaignAnnouncementStatusEnum {
  DELIVERED = "delivered",
  FAILED = "failed",
}

export const CAMPAIGN_ANNOUNCEMENTS_STATUS_DETAILS: Record<
  CampaignAnnouncementStatusEnum,
  { icon: LucideIcon; label: string; color: ColorEnum }
> = {
  [CampaignAnnouncementStatusEnum.DELIVERED]: {
    icon: CheckCircle,
    label: "Delivered",
    color: ColorEnum.GREEN,
  },
  [CampaignAnnouncementStatusEnum.FAILED]: {
    icon: CircleX,
    label: "Failed",
    color: ColorEnum.RED,
  },
}

export const CAMPAIGN_ANNOUNCEMENTS_TYPE_DETAILS: Record<
  CampaignAnnouncementTypeEnum,
  { icon: LucideIcon; label: string; color: ColorEnum }
> = {
  [CampaignAnnouncementTypeEnum.SMS]: {
    icon: MessageSquare,
    label: "SMS",
    color: ColorEnum.YELLOW,
  },
  [CampaignAnnouncementTypeEnum.EMAIL]: {
    icon: Mail,
    label: "Email",
    color: ColorEnum.BLUE,
  },
  [CampaignAnnouncementTypeEnum.APP]: {
    icon: Laptop,
    label: "App",
    color: ColorEnum.ORANGE,
  },
}
