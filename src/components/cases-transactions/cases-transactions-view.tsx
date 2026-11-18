import { FieldText } from "@/components/ui/text"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { COST_VISIBLE_ROLES } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type CasesTransaction } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getCaseName } from "@/utils/cases-transactions"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

interface CasesTransactionsViewProps {
  transaction: CasesTransaction
}

export function CasesTransactionsView({ transaction }: CasesTransactionsViewProps) {
  const { loggedInRole } = useLoggedInUser()

  if (!loggedInRole) {
    return null
  }
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery(
    { campaignId: transaction.campaignId! },
    {
      enabled: !!transaction.campaignId,
    }
  )
  const showCost = COST_VISIBLE_ROLES.includes(loggedInRole)
  const displayParticipantUser =
    transaction.user && shouldMaskParticipantPii(loggedInRole, participantAccessData?.isGranted ?? false)
      ? maskParticipantUserPii(transaction.user)
      : transaction.user

  if ((transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT) {
    return (
      <div className="flex flex-col gap-4">
        <FieldText label="Cases Transaction ID" value={transaction.id} adminOnly />

        <FieldText label="Quantity (shortage/damages)" value={transaction.quantity} />
        <FieldText
          label="Case Type"
          value={getCaseName({
            pricePerBarCents: transaction.pricePerBarCents ?? 0,
            barsPerCase: transaction.barsPerCase ?? 60,
          })}
        />
        <FieldText label="Note" value={transaction.note} />
        <FieldText label="Date" value={formatDate(transaction.createdAt)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Cases Transaction ID" value={transaction.id} adminOnly />
      <FieldText label="Parent transaction ID" value={transaction.parentTransactionId} adminOnly />

      {transaction.user?.fullName && (
        <>
          <FieldText label="Participant" value={getUserDisplayName(displayParticipantUser)} />
          <FieldText label="Participant ID" value={transaction.user.id} adminOnly />
        </>
      )}

      <FieldText label="Quantity" value={transaction.quantity} />
      <FieldText label="Bars per case" value={transaction.barsPerCase} />
      <FieldText label="Price per case" value={formatCentsToCurrency(transaction.pricePerCaseCents ?? 0)} />
      <FieldText label="Total price" value={formatCentsToCurrency(transaction.totalPriceCents ?? 0)} />

      {(transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.DELIVERED && (
        <>
          <FieldText label="Profit per case" value={formatCentsToCurrency(transaction.profitPerCaseCents ?? 0)} />
          <FieldText label="Total profit" value={formatCentsToCurrency(transaction.totalProfitCents ?? 0)} />
        </>
      )}

      {(transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.DELIVERED && showCost && (
        <>
          <FieldText label="Cost per case" value={formatCentsToCurrency(transaction.costPerCaseCents ?? 0)} />
          <FieldText label="Total cost" value={formatCentsToCurrency(transaction.totalCostCents ?? 0)} />
        </>
      )}

      <FieldText label="Date" value={formatDate(transaction.createdAt)} />
    </div>
  )
}
