"use client"

import { FieldText } from "@/components/ui/text"
import { useLoggedInUser } from "@/hooks"
import { type PaymentLog } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"
import { getUserDisplayName, maskParticipantUserPii, shouldMaskParticipantPii } from "@/utils/users"

interface PaymentLogsViewProps {
  paymentLog: PaymentLog
}

export function PaymentLogsView({ paymentLog }: PaymentLogsViewProps) {
  const { loggedInRole: role } = useLoggedInUser()
  const { data: participantAccessData } = api.participantNamesAccess.hasAccess.useQuery(
    { campaignId: paymentLog.campaignId! },
    {
      enabled: !!paymentLog.campaignId,
    }
  )
  const displayParticipantUser =
    paymentLog.user && shouldMaskParticipantPii(role, participantAccessData?.isGranted ?? false)
      ? maskParticipantUserPii(paymentLog.user)
      : paymentLog.user

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Payment Log ID" value={paymentLog.id} adminOnly />
      <FieldText label="Stripe ID" value={paymentLog.transactionId} adminOnly />

      {paymentLog.user?.fullName && (
        <>
          <FieldText label="Participant" value={getUserDisplayName(displayParticipantUser)} />
          <FieldText label="Participant ID" value={paymentLog.user.id} adminOnly />
        </>
      )}

      <FieldText label="Amount" value={formatCentsToCurrency(paymentLog.amountCents ?? 0)} />
      <FieldText label="Fee" value={formatCentsToCurrency(paymentLog.feeCents ?? 0)} />

      <FieldText label="Date" value={formatDate(paymentLog.createdAt)} />
    </div>
  )
}
