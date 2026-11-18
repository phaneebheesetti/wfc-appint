import { type Column } from "@tanstack/react-table"
import * as React from "react"

import { DataTableFacetedFilterDate } from "./data-table-faceted-filter-date"
import { DataTableFacetedFilterSingleMultiple } from "./data-table-faceted-filter-single-multiple"

export interface DataTableFacetedFilterOptions {
  label: string
  value: string | boolean
  icon?: React.ComponentType<{ className?: string }>
}

export interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  options?: DataTableFacetedFilterOptions[]
  type?: "single" | "multiple" | "date"
  onSelect: (value: (string | boolean)[]) => void
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  options = [],
  type = "single",
  onSelect,
}: DataTableFacetedFilterProps<TData, TValue>) {
  if (type === "single" || type === "multiple") {
    return <DataTableFacetedFilterSingleMultiple column={column} options={options} type={type} onSelect={onSelect} />
  }

  if (type === "date") {
    return <DataTableFacetedFilterDate column={column} onSelect={onSelect} />
  }

  return null
}
