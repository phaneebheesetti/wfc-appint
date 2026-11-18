import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { NotFoundShop } from "@/components/not-found"
import { RequestConfirmation } from "@/components/shop/request-confirmation"
import { db } from "@/server/db"
import { consumerPaymentLogs, digitalSalesInformation } from "@/server/db/schema"

interface RequestConfirmationPageProps {
  params: Promise<{
    id: string
    requestId: string
  }>
}

export default async function RequestConfirmationPage({ params }: RequestConfirmationPageProps) {
  const { id, requestId } = await params

  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(requestId).success) {
    return <NotFoundShop />
  }

  const salesPage = await db.query.digitalSalesInformation.findFirst({
    where: eq(digitalSalesInformation.id, id),
    with: { participant: true },
  })

  if (!salesPage?.participant) {
    return <NotFoundShop />
  }

  const request = await db.query.consumerPaymentLogs.findFirst({
    where: and(eq(consumerPaymentLogs.id, requestId), eq(consumerPaymentLogs.digitalSalesId, id)),
    with: { consumer: true },
  })

  if (!request?.consumer) {
    return <NotFoundShop />
  }

  return (
    <RequestConfirmation
      firstName={salesPage.participant.firstName ?? ""}
      email={request.consumer.email}
      packageLabel={request.orderDetails.packageLabel}
      buyerName={request.orderDetails.name}
    />
  )
}
