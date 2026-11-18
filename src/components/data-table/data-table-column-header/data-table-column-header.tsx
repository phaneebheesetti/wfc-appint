import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, FunnelPlus, ListFilter } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OrderByDirectionEnum } from "@/constants/database"
import { parseAsStringOrBoolean, useDataTableQueryStates } from "@/hooks/use-data-table-query-states"
import { cn } from "@/utils/cn"

import { DataTableColumnHeaderFilter, type FacetedFilter } from "./data-table-column-header-filter"
import { DataTableColumnHeaderSort } from "./data-table-column-header-sort"

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  column: Column<TData, TValue>
  facetedFilter?: FacetedFilter
}

export function DataTableColumnHeader<TData, TValue>({
  title,
  column,
  className,
  facetedFilter,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canFilter = column.getCanFilter() && !!facetedFilter
  const canSort = column.getCanSort()
  const canFilterAndSort = canFilter && canSort

  const { queryFilters, querySort } = useDataTableQueryStates({})
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  function setInitialFilterValue() {
    const queryFilterKey = facetedFilter?.accessorKey
    const queryFilterValue = queryFilters?.[queryFilterKey!] ?? []

    if (queryFilterValue.length === 0) return

    const parsedFilterValue = queryFilterValue.map(v => parseAsStringOrBoolean.parse(String(v)))

    column?.setFilterValue(parsedFilterValue)
  }

  function setInitialSortValue() {
    if (querySort.orderBy !== column.id) return

    column.toggleSorting(querySort.orderDirection === OrderByDirectionEnum.DESC)
  }

  function checkAndClearSorting() {
    if (column.getIsSorted() && !querySort.orderBy) {
      return column.clearSorting()
    }
  }

  function checkAndClearFiltering() {
    if (column.getFilterValue() && !queryFilters?.[facetedFilter?.accessorKey ?? ""]) {
      return column.setFilterValue(undefined)
    }
  }

  useEffect(() => {
    setInitialFilterValue()
    setInitialSortValue()
  }, [])

  // Call the checks in the effect body, not as a cleanup, which ran with stale values and cleared fresh filters.
  useEffect(() => {
    checkAndClearFiltering()
  }, [queryFilters])
  useEffect(() => {
    checkAndClearSorting()
  }, [querySort.orderBy])

  const isFiltered = !!column.getFilterValue()
  const isSorted = column.getIsSorted()
  const isFilteredOrSorted = isFiltered || isSorted

  if (!canSort && !canFilter) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 data-[state=open]:bg-accent font-semibold hover:bg-gray-200 text-wrap h-auto min-h-9"
          >
            <span>{title.replace(" / ", " / ")}</span>

            {isFilteredOrSorted ? (
              <>
                {isFiltered && <FunnelPlus />}

                {isSorted === "desc" && <ArrowDown />}

                {isSorted === "asc" && <ArrowUp />}
              </>
            ) : (
              <ListFilter />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="data-[state=closed]:!animate-none">
          {canSort && <DataTableColumnHeaderSort column={column} />}

          {canFilterAndSort && <DropdownMenuSeparator />}

          {canFilter && (
            <DataTableColumnHeaderFilter
              column={column}
              facetedFilter={facetedFilter}
              onSelect={() => setIsMenuOpen(false)}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
