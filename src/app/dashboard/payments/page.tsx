"use client"

import { PageTitle } from "@/components/page-title"
import { ParticipantPaymentsList } from "@/components/participant/participant-payments-list"

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Payments" description="View and manage your payments" />

      <ParticipantPaymentsList />
    </div>
  )
}
