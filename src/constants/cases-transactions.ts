import { Box, type LucideIcon, PackagePlus, Undo2 } from "lucide-react"

import { ColorEnum } from "@/constants/colors"

export enum CasesTransactionsTypeEnum {
  DELIVERED = "delivered",
  CHECKOUT = "checkout",
  INVENTORY_ADJUSTMENT = "inventory_adjustment",
}

export const CASES_TRANSACTIONS_TYPE_DETAILS: Record<
  CasesTransactionsTypeEnum,
  { label: string; icon: LucideIcon; color: ColorEnum }
> = {
  [CasesTransactionsTypeEnum.DELIVERED]: {
    label: "Case Delivered",
    icon: PackagePlus,
    color: ColorEnum.GREEN,
  },
  [CasesTransactionsTypeEnum.CHECKOUT]: {
    label: "Case Checked Out",
    icon: Box,
    color: ColorEnum.ORANGE,
  },
  [CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT]: {
    label: "Inventory Adjustment",
    icon: Undo2,
    color: ColorEnum.RED,
  },
}

export const INVENTORY_DISCLAIMER =
  "Your final invoice will reflect the amount due based on your organization’s order submitted to World’s Finest Chocolate. For questions regarding your order or invoice, please contact your sales representative."

export const INVENTORY_ADJUSTMENT_TOOLTIP =
  "Use this option to reduce inventory for delivery damages, shortages, or other inventory corrections."

export const INVENTORY_EDIT_RECOMMENDATION =
  "We recommend decreasing inventory by using the “− Inventory Adjustments” button and increasing inventory by using the “+ Add Cases Delivered” button."
