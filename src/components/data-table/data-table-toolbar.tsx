"use client"

import type { Table } from "@tanstack/react-table"
import debounce from "lodash.debounce"
import { FunnelX, Info, Plus, Search, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownButton } from "@/components/ui/button/dropdown-button"
import { Input } from "@/components/ui/input"
import { WithTooltip } from "@/components/ui/tooltip"
import { useDataTablePaginationQueryState } from "@/hooks"
import { useDataTableQueryStates } from "@/hooks/use-data-table-query-states"
import { cn } from "@/utils/cn"

import { type AdditionalButtonsProps, type NewButtonProps } from "./data-table"

export interface FilterColumn {
  accessorKey: string
  name: string
}

export interface MultiColumnFilter {
  columns: FilterColumn[]
  placeholder?: string
}

interface DataTableToolbarProps<TData> {
  id?: string
  table: Table<TData>
  multiColumnFilter?: MultiColumnFilter
  newButton?: NewButtonProps
  additionalButtons?: AdditionalButtonsProps[]
  hideSearch?: boolean
  searchContainerClassName?: string
  globalFilter?: string
  setGlobalFilter?: (value: string) => void
  searchModeToggle?: { label: string; onClick: () => void }
}

export function DataTableToolbar<TData>({
  id,
  table: _table,
  multiColumnFilter,
  newButton,
  additionalButtons = [],
  hideSearch = false,
  searchContainerClassName,
  setGlobalFilter,
  searchModeToggle,
}: DataTableToolbarProps<TData>) {
  const { setQueryPagination } = useDataTablePaginationQueryState()
  const { querySearch, setQuerySearch, canResetAllQueryStates, resetAllQueryStates } = useDataTableQueryStates({ id })
  const [inputValue, setInputValue] = useState(querySearch)

  const debounced = useMemo(
    () =>
      debounce((value: string) => {
        if (multiColumnFilter && setGlobalFilter) {
          setGlobalFilter(value)
        }

        void setQuerySearch(value)
        if (!value) return

        void setQueryPagination(paginationParams => ({ ...paginationParams, page: 1 }))
      }, 500),
    [multiColumnFilter, setGlobalFilter, setQuerySearch, setQueryPagination]
  )

  useEffect(() => {
    return () => debounced.cancel()
  }, [debounced])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    debounced(value)
  }

  useEffect(() => {
    handleInputChange(querySearch)
  }, [])

  const handleToggleSearchMode = () => {
    handleInputChange("")
    void setQueryPagination(paginationParams => ({ ...paginationParams, page: 1 }))
    searchModeToggle?.onClick()
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-8",
        searchModeToggle && "md:items-start"
      )}
    >
      {!hideSearch && (
        <div className="flex flex-col flex-1 w-full gap-2">
          <div className="flex flex-col md:flex-row w-full items-center gap-2 bg-input-background">
            <div
              className={cn(
                "flex items-center gap-2 border-[1px] border-input rounded-control px-3 h-10 w-full pr-1 focus-within:border-input-background-active focus-within:border-[1.5px]",
                searchContainerClassName
              )}
            >
              <Search size={16} className="min-h-4 min-w-4" />
              <Input
                value={inputValue}
                placeholder={
                  multiColumnFilter?.placeholder ??
                  (() => {
                    const columnNames = multiColumnFilter?.columns.map(c => c.name) ?? []

                    return `Search by ${columnNames.join(" or ")}`
                  })()
                }
                onChange={event => handleInputChange(event.target.value)}
                className="w-full border-none p-0 bg-transparent"
              />

              {inputValue !== "" && (
                <WithTooltip
                  content="Clear search"
                  side="top"
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleInputChange("")}
                      className="min-h-8 min-w-8 h-8 w-8"
                    >
                      <X />
                    </Button>
                  }
                />
              )}
            </div>

            {canResetAllQueryStates && (
              <WithTooltip
                content="Clear filters"
                side="top"
                trigger={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      handleInputChange("")
                      resetAllQueryStates()
                    }}
                  >
                    <FunnelX />
                  </Button>
                }
              />
            )}
          </div>
          {searchModeToggle && (
            <button
              type="button"
              onClick={handleToggleSearchMode}
              className="self-start text-sm text-primary underline"
            >
              {searchModeToggle.label}
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "items-center w-full md:w-auto gap-2",
          additionalButtons?.length === 0 && !newButton ? "hidden" : "flex"
        )}
      >
        {additionalButtons?.map(button =>
          button.buttons ? (
            <DropdownButton key={button.text} {...button} />
          ) : (
            <Button
              key={button.text}
              onClick={button.onClick}
              disabled={button.disabled}
              variant={button.variant ?? "outline"}
              className={cn("w-full md:w-auto", button.className)}
            >
              {button.icon && <button.icon size={16} />}
              {button.text}
              {button.infoTooltip && (
                <WithTooltip
                  content={button.infoTooltip}
                  side="top"
                  trigger={
                    <span className="relative top-[2px] inline-flex">
                      <Info size={16} />
                    </span>
                  }
                />
              )}
            </Button>
          )
        )}

        {newButton && (
          <Button onClick={newButton.onClick} disabled={newButton.disabled} className="w-full md:w-auto">
            <Plus />
            {newButton.text}
          </Button>
        )}
      </div>
    </div>
  )
}
