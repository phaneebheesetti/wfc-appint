"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DollarSign } from "lucide-react"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { COLOR_MAP } from "@/constants/colors"
import { PAYMENT_LOGS_TYPE_DETAILS, type PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type PaymentLog } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"

export function ParticipantPaymentsList() {
  const { loggedInRole: role, loggedInUserId } = useLoggedInUser()

  const { data, isLoading } =
    role !== RolesEnum.PARENT
      ? api.paymentLogs.listByUserId.useQuery({ userId: loggedInUserId! }, { enabled: !!loggedInUserId })
      : api.paymentLogs.listByParentId.useQuery({ parentId: loggedInUserId! }, { enabled: !!loggedInUserId })

  if (!role) return null

  const columns: ColumnDef<PaymentLog>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const paymentLog = row.original
        return <div>{formatDate(paymentLog.createdAt)}</div>
      },
    },
    {
      accessorKey: "user.fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Participant" />,
    },
    {
      accessorKey: "type",
      header: props => <DataTableColumnHeader {...props} title="Type" />,
      cell: ({ row }) => {
        const type = row.original.type
        if (!type) return null

        const { icon: Icon, label, color } = PAYMENT_LOGS_TYPE_DETAILS[type as PaymentLogsTypeEnum]
        const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

        return (
          <div className={cn("flex items-center gap-2", colorClasses.text)}>
            <Icon size={16} /> <div>{label}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "amountCents",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <>{formatCentsToCurrency(row.original.amountCents ?? 0)}</>,
    },
  ]

  return (
    <DataTable
      data={data ?? []}
      emptyState={{
        title: role === RolesEnum.PARENT ? "No payments found for your children" : "Your payments will appear here",
        icon: DollarSign,
      }}
      columns={columns}
      loading={isLoading}
      multiColumnFilter={{
        columns: [{ accessorKey: "user.fullName", name: "Participant" }],
      }}
    />
  )
}
