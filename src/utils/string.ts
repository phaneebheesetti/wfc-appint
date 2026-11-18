import * as cleanTextUtils from "clean-text-utils"

export const ENCRYPTED_STRING = "*********"

export const firstLetterUpperCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const firstLetterLowerCase = (str: string) => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

export const capitalizeEveryWord = (str: string): string => {
  return str
    .split(" ")
    .map(word => firstLetterUpperCase(word))
    .join(" ")
}

export const getDigitFromFirstChar = (str?: string): number => {
  if (!str) return 0

  const firstChar = str.charAt(0).toUpperCase()

  // If it's a digit (0-9), return that digit
  if (firstChar >= "0" && firstChar <= "9") {
    return parseInt(firstChar, 10)
  }

  // If it's a letter (A-Z), return its position in alphabet (A=1, B=2, etc.) mod 10
  if (firstChar >= "A" && firstChar <= "Z") {
    const alphabetPosition = firstChar.charCodeAt(0) - "A".charCodeAt(0) + 1
    return alphabetPosition % 10
  }

  // For any other character, return 0
  return 0
}

export const sanitizeString = (str?: string) => {
  if (!str || str.trim() === "") return undefined

  return str.trim()
}

export const normalizeStringSpecialCharacters = (str: string): string => {
  return cleanTextUtils.replace.exoticChars(str).trim().toLowerCase()
}

export const hasValue = (s: string | null | undefined): boolean => (s?.trim() ?? "") !== ""

export const naturalSort = (a: string, b: string, order: "asc" | "desc" = "asc"): number => {
  const aStartsWithDigit = /^\d/.test(a)
  const bStartsWithDigit = /^\d/.test(b)

  if (aStartsWithDigit && !bStartsWithDigit) return -1
  if (!aStartsWithDigit && bStartsWithDigit) return 1

  const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  return order === "asc" ? result : -result
}
