import * as Sentry from "@sentry/nextjs"

import { type ShopOrdersPaymentTypeEnum } from "@/constants/shop-orders"

interface SendShopOrderConfirmationEmailProps {
  salesPageId: string
  packageKey: string
  paymentType: ShopOrdersPaymentTypeEnum
  email: string
  buyerName: string | undefined
  address?: string | undefined
  varietyPreferences?: string | undefined
}

export const sendShopOrderConfirmationEmail = async (payload: SendShopOrderConfirmationEmailProps) => {
  try {
    const response = await fetch("/api/email/send/shop-order-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Order confirmation email failed with status ${response.status}`)
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        email_type: "shop-order-confirmation",
      },
      extra: {
        salesPageId: payload.salesPageId,
        packageKey: payload.packageKey,
        paymentType: payload.paymentType,
      },
    })
  }
}
