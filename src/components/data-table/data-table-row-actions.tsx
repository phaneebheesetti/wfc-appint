"use client"

import { type Row } from "@tanstack/react-table"
import { Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  tooltip?: string
  onClick: (row: Row<TData>) => void
}

export function DataTableRowActions<TData>({
  row,
  tooltip = "View Details",
  onClick,
}: DataTableRowActionsProps<TData>) {
  return (
    <div className="flex justify-end">
      <WithTooltip
        content={tooltip}
        side="top"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClick(row)}
            className="rounded-full bg-gray-100 hover:bg-gray-200 min-h-8 min-w-8 h-8 w-8"
          >
            <Ellipsis />
          </Button>
        }
      />
    </div>
  )
}
