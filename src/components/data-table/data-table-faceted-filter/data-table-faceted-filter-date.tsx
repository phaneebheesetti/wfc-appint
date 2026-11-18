import { CalendarDays } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/utils/date"

import { type DataTableFacetedFilterProps } from "./data-table-faceted-filter"

export function DataTableFacetedFilterDate<TData, TValue>({
  column,
  onSelect,
}: Pick<DataTableFacetedFilterProps<TData, TValue>, "column" | "onSelect">) {
  const [open, setOpen] = useState<boolean>(false)

  const values = (column?.getFilterValue() as string[]) ?? []
  const fromDate = values[0] ? new Date(values[0]) : undefined
  const toDate = values[1] ? new Date(values[1]) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
          <CalendarDays />

          {fromDate ? (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              from {formatDate(fromDate, { month: "short", day: "numeric", year: "numeric" })} to{" "}
              {formatDate(toDate ?? new Date(), { month: "short", day: "numeric", year: "numeric" })}
            </Badge>
          ) : open ? (
            "Close Calendar"
          ) : (
            "Open Calendar"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="center">
        <DateRangePicker
          initialDateFrom={fromDate}
          initialDateTo={toDate}
          onChange={value => {
            const filterValues = [value.from?.toUTCString(), value.to?.toUTCString()].filter(
              (date): date is string => date !== undefined
            )

            column?.setFilterValue(filterValues.length ? filterValues : undefined)
            onSelect(filterValues ?? [])
          }}
          onClear={() => {
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
