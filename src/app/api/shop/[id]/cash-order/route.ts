import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  PreferredContactMethodEnum,
} from "@/constants/consumer-payment-logs"
import { ShopOrdersContactMethodEnum } from "@/constants/shop-orders"
import { db } from "@/server/db"
import { consumerPaymentLogs, consumers, digitalSalesInformation, users } from "@/server/db/schema"
import { withSentry } from "@/utils/api"

type InventoryUpdateResult =
  | { status: "success" }
  | { status: "out_of_stock" }
  | { status: "low_stock" }
  | { status: "failed" }

const incrementSoldOnlineForCashOrder = async ({
  digitalSalesId,
  barsQuantity,
}: {
  digitalSalesId: string
  barsQuantity: number
}): Promise<InventoryUpdateResult> => {
  const salesInfo = await db.query.digitalSalesInformation.findFirst({
    columns: { digitalSalesDetails: true },
    where: eq(digitalSalesInformation.id, digitalSalesId),
  })

  const currentInventory = salesInfo?.digitalSalesDetails.inventory_details
  if (!currentInventory) return { status: "failed" }

  const availableBars =
    (currentInventory.total_bars ?? 0) - (currentInventory.sold_online ?? 0) - (currentInventory.sold_in_person ?? 0)

  if (availableBars <= 0) return { status: "out_of_stock" }
  if (barsQuantity > availableBars) return { status: "low_stock" }

  const [updated] = await db
    .update(digitalSalesInformation)
    .set({
      digitalSalesDetails: {
        ...salesInfo.digitalSalesDetails,
        inventory_details: {
          ...currentInventory,
          sold_online: currentInventory.sold_online + barsQuantity,
          updated_at: new Date().toISOString(),
        },
      },
    })
    .where(eq(digitalSalesInformation.id, digitalSalesId))
    .returning()

  return updated ? { status: "success" } : { status: "failed" }
}

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
    //create new consumer if email doesn't exist in consumers table
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
        paymentMethod: PaymentMethodEnum.CASH,
        paymentStatus: PaymentStatusEnum.PENDING,
        barsQuantity: bars,
        amountCents: priceCents,
        cardTransactionId: null,
        orderStatus: OrderStatusEnum.NOT_DELIVERED,
        updatedByUserId: null,
      })
      .returning({ id: consumerPaymentLogs.id })

    if (!consumerPaymentLog) {
      return NextResponse.json({ error: "Failed to create the cash order." }, { status: 500 })
    }

    // Update sold_online in inventory
    const inventoryUpdate = await incrementSoldOnlineForCashOrder({
      digitalSalesId: digitalSalesId,
      barsQuantity: bars,
    })

    if (inventoryUpdate.status !== "success") {
      const message =
        inventoryUpdate.status === "out_of_stock"
          ? "Requested quantity is out of stock"
          : inventoryUpdate.status === "low_stock"
            ? "Requested quantity is not available (Low Stock)"
            : "Failed to update the inventory for cash order"

      return NextResponse.json({ error: message }, { status: inventoryUpdate.status !== "failed" ? 409 : 500 })
    }

    return NextResponse.json(
      {
        data: {
          consumerId,
          consumerPaymentLogId: consumerPaymentLog.id,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined

    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({ error: [message, cause].filter(Boolean).join(" | ") }, { status: 500 })
  }
})

export const GET = withSentry(async (req: NextRequest, context) => {
  const params = (await context?.params) ?? {}
  const shopId = params.id as string

  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required." }, { status: 400 })
  }

  try {
    const [order] = await db
      .select({
        id: consumerPaymentLogs.id,
        digitalSalesId: consumerPaymentLogs.digitalSalesId,
        consumerId: consumerPaymentLogs.consumerId,
        orderDetails: consumerPaymentLogs.orderDetails,
        barsQuantity: consumerPaymentLogs.barsQuantity,
        amountCents: consumerPaymentLogs.amountCents,
        paymentMethod: consumerPaymentLogs.paymentMethod,
        paymentStatus: consumerPaymentLogs.paymentStatus,
        orderStatus: consumerPaymentLogs.orderStatus,
      })
      .from(consumerPaymentLogs)
      .where(and(eq(consumerPaymentLogs.id, orderId), eq(consumerPaymentLogs.digitalSalesId, shopId)))

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const [consumer] = await db
      .select({
        id: consumers.id,
        email: consumers.email,
      })
      .from(consumers)
      .where(eq(consumers.id, order.consumerId))

    if (!consumer) {
      return NextResponse.json({ error: "Consumer not found." }, { status: 404 })
    }

    const [participant] = await db
      .select({
        firstName: users.firstName,
      })
      .from(digitalSalesInformation)
      .innerJoin(users, eq(users.id, digitalSalesInformation.participantId))
      .where(eq(digitalSalesInformation.id, shopId))

    if (!participant) {
      return NextResponse.json({ error: "Participant not found." }, { status: 404 })
    }

    return NextResponse.json(
      {
        data: {
          order: {
            id: order.id,
            orderDetails: order.orderDetails,
            barsQuantity: order.barsQuantity,
            amountCents: order.amountCents,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
          },
          consumer: {
            email: consumer.email,
          },
          participant: {
            firstName: participant.firstName,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined

    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({ error: [message, cause].filter(Boolean).join(" | ") }, { status: 500 })
  }
}) as (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>
