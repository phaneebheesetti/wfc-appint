import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, RotateCcw } from "lucide-react"
import { useMemo } from "react"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { OrderByDirectionEnum } from "@/constants/database"
import { useDataTableQueryStates } from "@/hooks/use-data-table-query-states"

interface DataTableColumnHeaderSortProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
}

export function DataTableColumnHeaderSort<TData, TValue>({ column }: DataTableColumnHeaderSortProps<TData, TValue>) {
  const { querySort, setQuerySort, resetQuerySort } = useDataTableQueryStates({})

  const isSorted = useMemo(() => {
    return querySort.orderBy === column.id ? querySort.orderDirection : column.getIsSorted()
  }, [querySort.orderBy, querySort.orderDirection, column])

  const toggleSorting = (value: boolean) => {
    column.toggleSorting(value)

    void setQuerySort({
      orderBy: column.id,
      orderDirection: value ? OrderByDirectionEnum.DESC : OrderByDirectionEnum.ASC,
    })
  }

  const resetSorting = () => {
    column.clearSorting()
    resetQuerySort()
  }

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2">
        <ChevronsUpDown size={16} /> Sort
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => toggleSorting(false)} disabled={isSorted === "asc"}>
          <ArrowUp className="text-muted-foreground/70" />
          Ascending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleSorting(true)} disabled={isSorted === "desc"}>
          <ArrowDown className="text-muted-foreground/70" />
          Descending
        </DropdownMenuItem>

        {isSorted && (
          <DropdownMenuItem onClick={() => resetSorting()}>
            <RotateCcw className="text-muted-foreground/70" />
            Reset
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
    </>
  )
}
