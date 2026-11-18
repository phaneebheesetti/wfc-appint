import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { NotFoundShop } from "@/components/not-found"
import { OrderConfirmation } from "@/components/shop/order-confirmation"
import { db } from "@/server/db"
import { consumerPaymentLogs, digitalSalesInformation } from "@/server/db/schema"

interface OrderConfirmationPageProps {
  params: Promise<{
    id: string
    orderId: string
  }>
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { id, orderId } = await params

  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(orderId).success) {
    return <NotFoundShop />
  }

  const salesPage = await db.query.digitalSalesInformation.findFirst({
    where: eq(digitalSalesInformation.id, id),
    with: {
      participant: true,
    },
  })

  if (!salesPage?.participant) {
    return <NotFoundShop />
  }

  const order = await db.query.consumerPaymentLogs.findFirst({
    where: and(eq(consumerPaymentLogs.id, orderId), eq(consumerPaymentLogs.digitalSalesId, id)),
    with: {
      consumer: true,
    },
  })

  if (!order?.consumer) {
    return <NotFoundShop />
  }

  return (
    <OrderConfirmation
      shopId={id}
      firstName={salesPage.participant.firstName ?? ""}
      order={{
        id: order.id,
        orderDetails: order.orderDetails,
        barsQuantity: order.barsQuantity,
        amountCents: order.amountCents,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
      }}
      consumer={{
        email: order.consumer.email,
      }}
    />
  )
}
