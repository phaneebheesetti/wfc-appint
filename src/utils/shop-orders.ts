import { z } from "zod"

import { ShopOrdersContactMethodEnum } from "@/constants/shop-orders"
import { phoneType } from "@/lib/zod"

const EMPTY_PHONE_MESSAGE = "Please enter a valid phone number"

export const shopOrdersContactFormSchema = z.object({
  buyerName: z.string().trim().min(1, "Name is required"),
  deliveryAddress: z.string().max(500).optional(),
  email: z.email("Please enter a valid email address"),
  phone: z.string({ error: EMPTY_PHONE_MESSAGE }).pipe(phoneType),
  preferredContactMethod: z.enum(ShopOrdersContactMethodEnum, "Please choose how we should contact you"),
  varietyPreferences: z.string().max(500).optional(),
})

export type ShopOrdersContactFormValues = z.infer<typeof shopOrdersContactFormSchema>
