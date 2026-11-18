import { Check, FunnelX } from "lucide-react"
import * as React from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { cn } from "@/utils/cn"

import { type DataTableFacetedFilterOptions, type DataTableFacetedFilterProps } from "./data-table-faceted-filter"

export function DataTableFacetedFilterSingleMultiple<TData, TValue>({
  column,
  options = [],
  type = "single",
  onSelect,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const selectedValues = new Set(column?.getFilterValue() as (string | boolean)[])

  const uniqueOptions = Array.from(new Set(options.map(option => option.value)))
    .map(value => options.find(option => option.value === value))
    .filter(Boolean) as DataTableFacetedFilterOptions[]

  return (
    <Command>
      <CommandInput placeholder="Search" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {uniqueOptions.map(option => {
            const isSelected = selectedValues.has(option.value)

            return (
              <CommandItem
                key={String(option.value)}
                onSelect={() => {
                  if (type === "single") {
                    selectedValues.clear()
                  }

                  if (isSelected) {
                    selectedValues.delete(option.value)
                  } else {
                    selectedValues.add(option.value)
                  }

                  const filterValues = Array.from(selectedValues)
                  column?.setFilterValue(filterValues.length ? filterValues : undefined)
                  onSelect(filterValues ?? [])
                }}
              >
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check />
                </div>
                {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                <span>{option.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        {selectedValues.size > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  column?.setFilterValue(undefined)
                  onSelect([])
                }}
                className="justify-center text-center cursor-pointer"
              >
                <FunnelX /> Clear filters
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  )
}
