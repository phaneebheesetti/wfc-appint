import { parsePhoneNumberFromString } from "libphonenumber-js"
import { z } from "zod"

export const currencyType = z.string().transform(value => value.replace(/[^\d.-]/g, ""))

export const numberType = z.coerce.number<number>({ error: "Required" })

export const percentageType = z.coerce
  .number()
  .positive()
  .max(100)
  .refine(value => {
    const str = value.toString() ?? ""
    const decimalPart = str.split(".")[1] ?? ""

    // Check that it has at most 2 decimal places
    return decimalPart.length <= 2
  }, "Percentage can have at most 2 decimal places")

export const phoneType = z
  .string()
  .startsWith("+", "Phone number must start with +")
  .refine(
    value => {
      if (!value) return true
      const phone = parsePhoneNumberFromString(value)
      return phone?.isValid() ?? false
    },
    { message: "Must be a valid international phone number" }
  )
