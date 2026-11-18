import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { OrderStatusEnum, PreferredContactMethodEnum } from "@/constants/consumer-payment-logs"
import { ShopOrdersContactMethodEnum } from "@/constants/shop-orders"
import { db } from "@/server/db"
import { consumerPaymentLogs, consumers } from "@/server/db/schema"
import { withSentry } from "@/utils/api"

const bodySchema = z.object({
  email: z.email(),
  buyerName: z.string(),
  deliveryAddress: z.string().optional(),
  phone: z.string(),
  preferredContactMethod: z.enum(ShopOrdersContactMethodEnum),
  varietyPreferences: z.string().optional(),
  bars: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  packageLabel: z.string().min(1),
})

export const POST = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const digitalSalesId = params.id as string

  const {
    email,
    buyerName,
    deliveryAddress,
    phone,
    preferredContactMethod,
    varietyPreferences,
    bars,
    priceCents,
    packageLabel,
  } = bodySchema.parse(await req.json())

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const [inserted] = await db
      .insert(consumers)
      .values({ email: normalizedEmail })
      .onConflictDoNothing({ target: consumers.email })
      .returning({ id: consumers.id })

    const consumerId =
      inserted?.id ??
      (await db.select({ id: consumers.id }).from(consumers).where(eq(consumers.email, normalizedEmail)))[0]?.id

    if (!consumerId) {
      return NextResponse.json({ error: "Failed to resolve consumer." }, { status: 500 })
    }

    const [consumerPaymentLog] = await db
      .insert(consumerPaymentLogs)
      .values({
        digitalSalesId,
        consumerId,
        orderDetails: {
          name: buyerName ?? "",
          address: deliveryAddress ?? "",
          phoneNumber: phone,
          preferredContactMethod:
            preferredContactMethod === ShopOrdersContactMethodEnum.EMAIL
              ? PreferredContactMethodEnum.EMAIL
              : PreferredContactMethodEnum.PHONE,
          preferences: varietyPreferences ?? "",
          packageLabel,
        },
        barsQuantity: bars,
        amountCents: priceCents,
        orderStatus: OrderStatusEnum.REQUESTED,
      })
      .returning({ id: consumerPaymentLogs.id })

    if (!consumerPaymentLog) {
      return NextResponse.json({ error: "Failed to create the request." }, { status: 500 })
    }

    return NextResponse.json({ data: { consumerId, consumerPaymentLogId: consumerPaymentLog.id } }, { status: 200 })
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined
    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({ error: [message, cause].filter(Boolean).join(" | ") }, { status: 500 })
  }
}) as (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>
