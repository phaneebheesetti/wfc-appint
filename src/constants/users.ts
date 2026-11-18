import { CheckCircleIcon, ClockIcon, type LucideIcon, TrashIcon, XCircleIcon } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum UsersStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  DELETED = "deleted",
}

export const USER_STATUS_DETAILS: Record<UsersStatusEnum, { label: string; icon: LucideIcon; color: ColorEnum }> = {
  [UsersStatusEnum.ACTIVE]: {
    label: "Active",
    icon: CheckCircleIcon,
    color: ColorEnum.GREEN,
  },
  [UsersStatusEnum.INACTIVE]: {
    label: "Inactive",
    icon: XCircleIcon,
    color: ColorEnum.RED,
  },
  [UsersStatusEnum.PENDING]: {
    label: "Pending",
    icon: ClockIcon,
    color: ColorEnum.ORANGE,
  },
  [UsersStatusEnum.DELETED]: {
    label: "Deleted",
    icon: TrashIcon,
    color: ColorEnum.RED,
  },
}
