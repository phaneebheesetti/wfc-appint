import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

import { db } from "@/server/db"
import { consumerPaymentLogs } from "@/server/db/schema"
import { withSentry } from "@/utils/api"

export const POST = withSentry(async (_req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const orderId = params.orderId as string

  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 })
  }

  const existing = await db.query.consumerPaymentLogs.findFirst({
    where: eq(consumerPaymentLogs.id, orderId),
    columns: { orderDetails: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 })
  }

  await db
    .update(consumerPaymentLogs)
    .set({
      orderDetails: {
        ...existing.orderDetails,
        pollingTimedOutAt: new Date().toISOString(),
      },
    })
    .where(eq(consumerPaymentLogs.id, orderId))

  return NextResponse.json({ data: { ok: true } }, { status: 200 })
})
