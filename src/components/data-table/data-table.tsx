"use client"

import {
  type Column,
  type ColumnDef,
  type ColumnDefResolved,
  type ColumnFiltersState,
  type ColumnPinningState,
  type HeaderContext,
  type SortingState,
  type Table as TableInstance,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { type LucideIcon, SearchX } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PAGINATION_LIMIT_DEFAULT } from "@/constants/database"
import { useDataTableQueryStates } from "@/hooks/use-data-table-query-states"
import { type Pagination } from "@/types/pagination"
import { cn } from "@/utils/cn"

import { DataTableControlledPagination } from "./data-table-controlled-pagination"
import { DataTableEmpty, type DataTableEmptyProps } from "./data-table-empty"
import { dateBetweenFilterFn } from "./data-table-filter-date-between"
import { DataTableLoading } from "./data-table-loading"
import { DataTableToolbar, type MultiColumnFilter } from "./data-table-toolbar"
import { DataTableUncontrolledPagination } from "./data-table-uncontrolled-pagination"

const DEFAULT_COLUMN_SIZE = 75

function getCommonPinningStyles<TData>(column: Column<TData, unknown>): CSSProperties {
  const size = column.getSize()
  const isCustomSize = size !== DEFAULT_COLUMN_SIZE

  const isPinned = column.getIsPinned()
  if (!isPinned) {
    return {
      minWidth: size,
      maxWidth: isCustomSize ? size : undefined,
      position: "relative",
      zIndex: 0,
    }
  }

  const isLastLeftPinnedColumn = isPinned === "left" && column.getIsLastColumn("left")
  const isFirstRightPinnedColumn = isPinned === "right" && column.getIsFirstColumn("right")

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,

    minWidth: size,
    maxWidth: isCustomSize ? size : undefined,
    position: "sticky",
    zIndex: 1,

    boxShadow: isLastLeftPinnedColumn
      ? "-4px 0 1px -4px gray inset"
      : isFirstRightPinnedColumn
        ? "4px 0 1px -4px gray inset"
        : undefined,
  }
}

// Calls the header function directly so headers keep their state, such as an open dropdown, across re-renders.
function renderHeader<TData, TValue>(
  header: ColumnDef<TData, TValue>["header"],
  context: HeaderContext<TData, TValue>
): ReactNode {
  return typeof header === "function" ? header(context) : header
}

export interface NewButtonProps {
  text: string
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
}

export interface AdditionalButtonsProps extends NewButtonProps {
  variant?: "default" | "outline" | "secondary"
  buttons?: NewButtonProps[]
  className?: string
  infoTooltip?: string
}

interface DataTableProps<TData, TValue> {
  id?: string
  columns: ColumnDef<TData, TValue>[]
  hiddenColumns?: string[]
  data: TData[]
  loading?: boolean
  multiColumnFilter?: MultiColumnFilter
  emptyState: DataTableEmptyProps
  newButton?: NewButtonProps
  additionalButtons?: AdditionalButtonsProps[]
  hideSearch?: boolean
  autoResetPageIndex?: boolean
  onRowClick?: (row: TData) => void
  onTableCreated?: (table: TableInstance<TData>) => void
  searchContainerClassName?: string
  initialPageSize?: number
  pagination?: Pagination
  columnPinning?: ColumnPinningState
  searchModeToggle?: { label: string; onClick: () => void }
}

export function DataTable<TData, TValue>({
  id,
  columns: unfilteredColumns,
  hiddenColumns = [],
  data,
  loading,
  emptyState,
  multiColumnFilter,
  newButton,
  additionalButtons,
  hideSearch = false,
  autoResetPageIndex = true,
  onRowClick,
  onTableCreated,
  searchContainerClassName,
  initialPageSize = PAGINATION_LIMIT_DEFAULT,
  pagination,
  columnPinning = undefined,
  searchModeToggle,
}: DataTableProps<TData, TValue>) {
  const hasLoadedOnce = useRef(false)
  if (!loading && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true
  }

  const { querySearch } = useDataTableQueryStates({ id })
  const [rowSelection, setRowSelection] = useState({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  useEffect(() => {
    if (multiColumnFilter) {
      setGlobalFilter(querySearch ?? "")
    }
  }, [multiColumnFilter, querySearch])

  const columns = unfilteredColumns.filter(column => {
    const accessorKey = (column as ColumnDefResolved<TData, TValue>).accessorKey
    if (!accessorKey) return true

    return !hiddenColumns.includes(accessorKey)
  })

  // Custom global filter function for multi-column OR search
  const globalFilterFn = useCallback(
    (row: { getValue: (key: string) => unknown }, _columnId: string, value: string) => {
      if (!multiColumnFilter || !value) return true

      const searchValue = value.toLowerCase()

      return multiColumnFilter.columns.some(column => {
        const accessorKey = column.accessorKey.replaceAll(".", "_")
        const cellValue = row.getValue(accessorKey)
        if (cellValue == null) return false

        if (typeof cellValue !== "string") return false

        return cellValue.toLowerCase().includes(searchValue)
      })
    },
    [multiColumnFilter]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      globalFilter,
      columnPinning: columnPinning ?? {
        left: [],
        right: [],
      },
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
        pageIndex: 0,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: multiColumnFilter ? globalFilterFn : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    autoResetPageIndex,
    filterFns: { dateBetween: dateBetweenFilterFn },
    defaultColumn: {
      filterFn: "includesString",
      size: DEFAULT_COLUMN_SIZE,
    },
    manualFiltering: !!pagination,
    manualSorting: !!pagination,
  })

  useEffect(() => {
    onTableCreated?.(table)
  }, [table, onTableCreated])

  if (loading && !hasLoadedOnce.current) {
    return (
      <DataTableLoading hideSearch={hideSearch} additionalButtons={additionalButtons} columnsLength={columns.length} />
    )
  }

  const tableRows = table.getRowModel().rows
  const tableHeaderGroups = table.getHeaderGroups()

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        id={id}
        table={table}
        multiColumnFilter={multiColumnFilter}
        newButton={newButton}
        additionalButtons={additionalButtons}
        hideSearch={hideSearch}
        searchContainerClassName={searchContainerClassName}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        searchModeToggle={searchModeToggle}
      />

      <div className="rounded-card border">
        <Table
          innerTableProps={
            columnPinning
              ? {
                  style: {
                    minWidth: "100%",
                    width: table.getTotalSize(),
                  },
                }
              : undefined
          }
        >
          <TableHeader>
            {tableHeaderGroups.map(headerGroup => (
              <TableRow
                key={headerGroup.id}
                className="group bg-[#fefbf5] hover:bg-[#f8f3ea] data-[state=selected]:bg-[#fefbf5]"
              >
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={getCommonPinningStyles(header.column)}
                    className={cn(
                      "bg-[#fefbf5] group-hover:bg-[#f8f3ea] group-data-[state=selected]:bg-[#fefbf5]",
                      index === 0 && "rounded-tl-card",
                      index === headerGroup.headers.length - 1 && "rounded-tr-card"
                    )}
                  >
                    {header.isPlaceholder ? null : renderHeader(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tableRows?.length > 0 ? (
              tableRows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={e => {
                    const target = e.target as HTMLElement
                    if (target.tagName === "INPUT" || target.tagName === "BUTTON") {
                      return
                    }
                    onRowClick?.(row.original)
                  }}
                  className="group bg-white hover:bg-[#faf7f2] data-[state=selected]:bg-[#faf7f2] "
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      style={getCommonPinningStyles(cell.column)}
                      className={cn(
                        "overflow-hidden first-letter:uppercase bg-white group-hover:bg-[#faf7f2] group-data-[state=selected]:bg-[#faf7f2]",
                        index === 0 && "rounded-bl-card",
                        index === row.getVisibleCells().length - 1 && "rounded-br-card"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {loading ? (
                    <DataTableLoading hideSearch={true} additionalButtons={[]} columnsLength={columns.length} />
                  ) : globalFilter ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <SearchX size={28} className="text-muted-foreground" />
                      <p className="font-medium">{emptyState.searchTitle ?? "No Results"}</p>
                    </div>
                  ) : (
                    <DataTableEmpty {...emptyState} newButton={newButton} />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <DataTableControlledPagination pagination={pagination} />
      ) : (
        <DataTableUncontrolledPagination table={table} />
      )}
    </div>
  )
}
