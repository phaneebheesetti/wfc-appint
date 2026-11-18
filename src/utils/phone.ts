import parsePhoneNumber, { isValidPhoneNumber } from "libphonenumber-js"

export const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber || typeof phoneNumber !== "string" || !isValidPhoneNumber(phoneNumber)) {
    return phoneNumber
  }

  try {
    const parsedNumber = parsePhoneNumber(phoneNumber)
    return parsedNumber?.formatInternational()
  } catch (_error) {
    return phoneNumber
  }
}

export const formatPhoneNumberWithCallingCode = (phoneNumber: string) => {
  if (!phoneNumber || typeof phoneNumber !== "string" || !isValidPhoneNumber(phoneNumber)) {
    return phoneNumber
  }

  try {
    const parsedNumber = parsePhoneNumber(phoneNumber)
    if (!parsedNumber) return phoneNumber

    return `+${parsedNumber.countryCallingCode} ${parsedNumber.formatNational()}`
  } catch (_error) {
    return phoneNumber
  }
}
