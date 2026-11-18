import { useMemo } from "react"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatCentsToCurrency, getMoneyProgressAndValueClassName } from "@/utils/money"

import { ParticipantDashboardSectionTitle } from "./participant-dashboard-section-title"

interface ParticipantDashboardMoneyProps {
  userId: string
}

export function ParticipantDashboardMoney({ userId }: ParticipantDashboardMoneyProps) {
  const { data: paymentLogs = [], isLoading: isLoadingPaymentLogs } = api.paymentLogs.listByUserId.useQuery(
    { userId },
    { enabled: !!userId }
  )
  const { data: casesTransactions = [], isLoading: isLoadingCasesTransactions } =
    api.casesTransactions.getAllFromUser.useQuery({ userId }, { enabled: !!userId })

  const isLoading = isLoadingPaymentLogs || isLoadingCasesTransactions

  const totalPaidCents = useMemo(() => {
    return paymentLogs?.filter(log => log.deletedAt === null).reduce((acc, log) => acc + (log.amountCents ?? 0), 0) ?? 0
  }, [paymentLogs])

  const totalOwedCents = useMemo(() => {
    return (
      casesTransactions
        ?.filter(transaction => transaction.type === (CasesTransactionsTypeEnum.CHECKOUT as string))
        .reduce((acc, transaction) => acc + (transaction.totalPriceCents ?? 0), 0) ?? 0
    )
  }, [casesTransactions])

  const { progressClassName, valueClassName } = useMemo(
    () => getMoneyProgressAndValueClassName(totalPaidCents, totalOwedCents),
    [totalPaidCents, totalOwedCents]
  )

  const progress = useMemo(
    () => (totalOwedCents > 0 ? (totalPaidCents / totalOwedCents) * 100 : 0),
    [totalPaidCents, totalOwedCents]
  )

  if (isLoading) {
    return <Skeleton className="w-full h-48" />
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <ParticipantDashboardSectionTitle title="Paid / Owed" />

      <Progress value={progress} className={progressClassName} />

      <div className={cn("flex items-center gap-1", valueClassName)}>
        {formatCentsToCurrency(totalPaidCents)}
        <span className="text-[10px] text-muted-foreground"> / {formatCentsToCurrency(totalOwedCents)}</span>
      </div>
    </Card>
  )
}
