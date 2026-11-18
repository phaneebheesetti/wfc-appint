"use client"

import { FileDown, FileSpreadsheet, FileText } from "lucide-react"
import { useState } from "react"

import { DropdownButton } from "@/components/ui/button/dropdown-button"
import { Skeleton } from "@/components/ui/skeleton"
import { ANONYMOUS_BUYER_NAME, OrderStatusEnum, PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import type { OrderSummaryListItem } from "@/server/services/consumer-payment-logs"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatDate } from "@/utils/date"
import { FileReportType, downloadFileReport } from "@/utils/files"
import { formatCentsToCurrency } from "@/utils/money"
import { formatPhoneNumberWithCallingCode } from "@/utils/phone"

import { formatPackageLabel } from "../campaigns/campaign-dashboard/digital-sales/format-package-label"
import { DeliverOrderDialog } from "./deliver-order-dialog"
import { OrderCard } from "./order-card"
import { ORDER_FILTERS, type OrderFilterValue } from "./order-filters"

const DELIVERY_STATUS_LABELS: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.NOT_DELIVERED]: "Not Delivered",
  [OrderStatusEnum.DELIVERED]: "Delivered",
  [OrderStatusEnum.REQUESTED]: "Requested",
}

interface OrderListProps {
  participantId: string
  fundraiserId: string
  participantFirstName: string
  participantName: string
  organizationName: string
  fundraiserName: string
}

export function OrderList({
  participantId,
  fundraiserId,
  participantFirstName,
  participantName,
  organizationName,
  fundraiserName,
}: OrderListProps) {
  const [activeFilter, setActiveFilter] = useState<OrderFilterValue>("all")
  const [selectedOrder, setSelectedOrder] = useState<OrderSummaryListItem | null>(null)

  const queryInput = { participantId, fundraiserId }

  const { data: orders, isLoading } = api.consumerPaymentLogs.getOrders.useQuery(queryInput, {
    enabled: !!participantId && !!fundraiserId,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  const allOrders = [...(orders ?? [])].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
  const filter = ORDER_FILTERS.find(({ value }) => value === activeFilter) ?? ORDER_FILTERS[0]!
  const visibleOrders = allOrders.filter(filter.matches)

  const buildReportRows = () =>
    allOrders.map(order => ({
      "Participant Name": participantName,
      "Organization Name": organizationName,
      "Fundraiser Name": fundraiserName,
      "Buyer Name": order.buyerName ?? ANONYMOUS_BUYER_NAME,
      "Item Ordered": formatPackageLabel(order.packageLabel, order.barsQuantity),
      "Order Date": formatDate(new Date(order.placedAt)),
      Phone: formatPhoneNumberWithCallingCode(order.phoneNumber) ?? "",
      Email: order.email,
      Address: order.address ?? "",
      "Special Request": order.preferences ?? "",
      "Payment Status": order.paymentStatus === PaymentStatusEnum.PAID ? "Paid" : "Cash Due",
      Amount: formatCentsToCurrency(order.amountCents),
      "Delivery Status": DELIVERY_STATUS_LABELS[order.orderStatus],
    }))

  const handleDownloadReport = async (type: FileReportType) => {
    await downloadFileReport({
      type,
      fileName: `${participantName} ${fundraiserName} order summary report`,
      data: buildReportRows(),
      sheetName: "Order Summary Report",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Filter orders" className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map(({ value, label, matches }) => {
            const isActive = value === activeFilter

            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(value)}
                className={cn(
                  "inline-flex min-w-[88px] flex-col items-center justify-center gap-1 rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground"
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "border border-input text-foreground"
                  )}
                >
                  {allOrders.filter(matches).length}
                </span>
              </button>
            )
          })}
        </div>

        <DropdownButton
          text="Download Report"
          icon={FileDown}
          variant="secondary"
          className="w-full md:w-auto"
          disabled={allOrders.length === 0}
          buttons={[
            {
              text: "Excel File",
              icon: FileSpreadsheet,
              onClick: () => void handleDownloadReport(FileReportType.EXCEL),
            },
            {
              text: "CSV File",
              icon: FileText,
              onClick: () => void handleDownloadReport(FileReportType.CSV),
            },
          ]}
        />
      </div>

      {visibleOrders.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{filter.emptyMessage}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleOrders.map(order => (
            <OrderCard key={order.id} order={order} onDeliver={() => setSelectedOrder(order)} />
          ))}
        </div>
      )}

      {selectedOrder && (
        <DeliverOrderDialog
          order={selectedOrder}
          open
          onOpenChange={open => {
            if (!open) setSelectedOrder(null)
          }}
          participantId={participantId}
          fundraiserId={fundraiserId}
          participantFirstName={participantFirstName}
          onDelivered={() =>
            setActiveFilter(current => (current === "all" || current === "delivered" ? current : "delivered"))
          }
        />
      )}
    </div>
  )
}
