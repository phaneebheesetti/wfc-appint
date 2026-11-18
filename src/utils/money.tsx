export const parseCurrency = (value: string | number) => parseFloat(value?.toString().replace(/[^\d.-]/g, "")) || 0

export const formatCurrency = (value: number, digits = 2) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export const formatCentsToCurrency = (cents: number | undefined | null, digits = 2): string => {
  if (cents === undefined || cents === null) {
    return formatCurrency(0)
  }

  const dollars = cents / 100

  return formatCurrency(dollars, digits)
}

export const formatCurrencyToCents = (value: string) => {
  const amount = +value.replace(/[^\d.-]/g, "")

  return amount * 100
}

export const getMoneyProgressAndValueClassName = (totalPaidCents: number, totalOwedCents: number) => {
  let progressClassName = ""
  let valueClassName = ""

  const progress = totalOwedCents > 0 ? (totalPaidCents / totalOwedCents) * 100 : 0

  const step = Math.floor(progress / 10)

  switch (step) {
    case 0:
      progressClassName = "[&>*]:bg-red-500"
      valueClassName = "text-red-500"
      break
    case 1:
      progressClassName = "[&>*]:bg-red-500"
      valueClassName = "text-red-500"
      break
    case 2:
      progressClassName = "[&>*]:bg-orange-500"
      valueClassName = "text-orange-500"
      break
    case 3:
      progressClassName = "[&>*]:bg-orange-500"
      valueClassName = "text-orange-500"
      break
    case 4:
      progressClassName = "[&>*]:bg-amber-500"
      valueClassName = "text-amber-500"
      break
    case 5:
      progressClassName = "[&>*]:bg-amber-500"
      valueClassName = "text-amber-500"
      break
    case 6:
      progressClassName = "[&>*]:bg-yellow-500"
      valueClassName = "text-yellow-500"
      break
    case 7:
      progressClassName = "[&>*]:bg-yellow-500"
      valueClassName = "text-yellow-500"
      break
    case 8:
      progressClassName = "[&>*]:bg-lime-500"
      valueClassName = "text-lime-500"
      break
    case 9:
      progressClassName = "[&>*]:bg-lime-500"
      valueClassName = "text-lime-500"
      break
    default:
      progressClassName = "[&>*]:bg-green-500"
      valueClassName = "text-green-500"
      break
  }

  if (totalPaidCents === 0 && totalOwedCents === 0) {
    progressClassName = ""
    valueClassName = "text-muted-foreground opacity-50"
  }

  return { progressClassName, valueClassName }
}
