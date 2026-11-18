"use client"

import { format } from "date-fns"
import { Box, CircleDollarSign, CreditCard } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { CampaignTransactionEnum } from "@/constants/campaigns"
import { PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { type CampaignTransaction } from "@/server/api/routers/campaigns"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatCurrency } from "@/utils/money"

export function CampaignUserTransactionsCard({ transaction }: { transaction: CampaignTransaction }) {
  const isPayment = transaction.type === CampaignTransactionEnum.PAYMENT
  const isCheckout = transaction.type === CampaignTransactionEnum.CHECKOUT

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4",
        isPayment && "bg-green-50 border-green-200",
        isCheckout && "bg-orange-50 border-orange-200"
      )}
    >
      {isPayment && (
        <div>
          <div className="flex justify-between items-center gap-2">
            <div className="text-sm font-medium flex items-center gap-2 justify-between w-full">
              {(transaction.transactionType as PaymentLogsTypeEnum) === PaymentLogsTypeEnum.CASH && (
                <>
                  <div>Cash Payment Received</div> <CircleDollarSign size={16} className="text-green-500" />
                </>
              )}
              {(transaction.transactionType as PaymentLogsTypeEnum) === PaymentLogsTypeEnum.DIGITAL && (
                <>
                  <div>Digital Payment Received</div> <CreditCard size={16} className="text-green-500" />
                </>
              )}
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(transaction.amount)}</div>
        </div>
      )}
      {isCheckout && (
        <div>
          <div className="flex justify-between items-center gap-2">
            <div className="text-sm font-medium">Cases Checked Out</div>
            <Box size={16} className="text-orange-500" />
          </div>
          <div className="text-2xl font-bold">
            {transaction.amount} Case{transaction.amount > 1 ? "s" : ""}
          </div>
        </div>
      )}
      <div>
        <div className="text-xs text-muted-foreground ">{format(transaction.createdAt, "MM/dd/yyyy")}</div>
      </div>
    </div>
  )
}

interface CampaignUserTransactionsProps {
  campaignId: string
  userId: string
}

export function CampaignUserTransactions({ campaignId, userId }: CampaignUserTransactionsProps) {
  const { data: transactions, isLoading } = api.campaigns.getTransactionsByUserId.useQuery({
    campaignId,
    userId,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 max-h-[calc(100vh-200px)]">
      {transactions?.map((transaction, index) => {
        return <CampaignUserTransactionsCard key={`key-${index}`} transaction={transaction} />
      })}
    </div>
  )
}
