import { type Row } from "@tanstack/react-table"

export const dateBetweenFilterFn = <TData>(row: Row<TData>, columnId: string, value: [string, string]): boolean => {
  const date = row.getValue(columnId)
  if (!(date instanceof Date)) {
    return false
  }

  const [start, end] = value ?? []
  const startDate = start ? new Date(start) : undefined
  const endDate = end ? new Date(end) : undefined

  if (!(startDate instanceof Date || startDate === undefined) || !(endDate instanceof Date || endDate === undefined)) {
    return false
  }

  // If one filter defined and date is undefined, filter it
  if ((startDate || endDate) && !date) {
    return false
  }

  if (startDate && !endDate) {
    return date.getTime() >= startDate.getTime()
  } else if (!startDate && endDate) {
    return date.getTime() <= endDate.getTime()
  } else if (startDate && endDate) {
    return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime()
  }

  return true
}
