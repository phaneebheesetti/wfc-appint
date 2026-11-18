import { CircleDollarSign, CreditCard, type LucideIcon } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum PaymentLogsTypeEnum {
  DIGITAL = "digital",
  CASH = "cash",
}

export enum PaymentLogsStatusEnum {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const PAYMENT_LOGS_STATUS_LABEL: Partial<Record<PaymentLogsStatusEnum, string>> = {
  [PaymentLogsStatusEnum.COMPLETED]: "Successful",
  [PaymentLogsStatusEnum.PENDING]: "Pending",
}

export const PAYMENT_LOGS_TYPE_DETAILS: Record<
  PaymentLogsTypeEnum,
  { label: string; icon: LucideIcon; color: ColorEnum }
> = {
  [PaymentLogsTypeEnum.DIGITAL]: {
    label: "Digital",
    icon: CreditCard,
    color: ColorEnum.GREEN,
  },
  [PaymentLogsTypeEnum.CASH]: {
    label: "Cash",
    icon: CircleDollarSign,
    color: ColorEnum.GREEN,
  },
}
