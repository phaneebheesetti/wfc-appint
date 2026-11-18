import type { Column } from "@tanstack/react-table"
import { Funnel } from "lucide-react"

import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useDataTablePaginationQueryState } from "@/hooks/use-data-table-pagination-query-state"
import { useDataTableQueryStates } from "@/hooks/use-data-table-query-states"

import { DataTableFacetedFilter, type DataTableFacetedFilterOptions } from "../data-table-faceted-filter"

export interface FacetedFilter {
  accessorKey: string
  options?: DataTableFacetedFilterOptions[]
  type: "single" | "multiple" | "date"
}

interface DataTableColumnHeaderFilterProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  id?: string
  column: Column<TData, TValue>
  facetedFilter: FacetedFilter
  onSelect?: () => void
}

export function DataTableColumnHeaderFilter<TData, TValue>({
  id,
  column,
  facetedFilter,
  onSelect,
}: DataTableColumnHeaderFilterProps<TData, TValue>) {
  const { setQueryPagination } = useDataTablePaginationQueryState()
  const { setQueryFilters } = useDataTableQueryStates({})

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Funnel size={16} /> Filter
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DataTableFacetedFilter
          key={facetedFilter.accessorKey}
          column={column}
          onSelect={value => {
            void setQueryFilters({
              [id ? `${id}-${facetedFilter.accessorKey}` : facetedFilter.accessorKey]: value as string[],
            })
            void setQueryPagination(paginationParams => ({ ...paginationParams, page: 1 }))
            onSelect?.()
          }}
          {...facetedFilter}
        />
      </DropdownMenuGroup>
    </>
  )
}
