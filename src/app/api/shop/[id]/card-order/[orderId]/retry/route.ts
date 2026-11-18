import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

import { PaymentStatusEnum } from "@/constants/consumer-payment-logs"
import { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (_req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const orderId = params.orderId as string

  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 })
  }

  try {
    const existing = await db.query.consumerPaymentLogs.findFirst({
      where: eq(consumerPaymentLogs.id, orderId),
    })

    if (!existing || existing.paymentStatus === PaymentStatusEnum.PAID) {
      return NextResponse.json({ error: "Order cannot be retried." }, { status: 409 })
    }

    const restOrderDetails = { ...existing.orderDetails }
    delete restOrderDetails.pollingTimedOutAt

    await db
      .update(consumerPaymentLogs)
      .set({ paymentStatus: PaymentStatusEnum.PROCESSING, orderDetails: restOrderDetails })
      .where(eq(consumerPaymentLogs.id, orderId))

    return NextResponse.json({ data: { id: existing.id } }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
