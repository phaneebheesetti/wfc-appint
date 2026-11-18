import { formatDistanceToNow } from "date-fns"

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString(navigator.language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  })
}

export function formatTime(date: Date, options?: Intl.DateTimeFormatOptions) {
  return date.toLocaleTimeString(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  })
}

export function formatDateAndTime(date: Date, options?: Intl.DateTimeFormatOptions) {
  return `${formatDate(date, options)} at ${formatTime(date, options)}`
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function formatUtcDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function getPercentageOfTimePassed(startDate: Date, endDate: Date) {
  if (!startDate || !endDate) return 0

  const now = new Date()
  const timePassed = now.getTime() - startDate.getTime()
  const totalTime = endDate.getTime() - startDate.getTime()
  const percentage = (timePassed / totalTime) * 100

  if (percentage < 0) return 0
  if (percentage > 100) return 100

  return percentage
}
