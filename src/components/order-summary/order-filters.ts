import { OrderStatusEnum } from "@/constants/consumer-payment-logs"
import type { OrderSummaryListItem } from "@/server/services/consumer-payment-logs"

export type OrderFilterValue = "all" | "notDelivered" | "delivered" | "requests"

export interface OrderFilter {
  value: OrderFilterValue
  label: string
  emptyMessage: string
  matches: (order: OrderSummaryListItem) => boolean
}

export const ORDER_FILTERS: OrderFilter[] = [
  {
    value: "all",
    label: "All",
    emptyMessage: "No orders yet",
    matches: () => true,
  },
  {
    value: "notDelivered",
    label: "Not Delivered",
    emptyMessage: "No pending orders",
    matches: order => order.orderStatus === OrderStatusEnum.NOT_DELIVERED,
  },
  {
    value: "delivered",
    label: "Delivered",
    emptyMessage: "No delivered orders",
    matches: order => order.orderStatus === OrderStatusEnum.DELIVERED,
  },
  {
    value: "requests",
    label: "Requests",
    emptyMessage: "No requests",
    matches: order => order.orderStatus === OrderStatusEnum.REQUESTED,
  },
]
