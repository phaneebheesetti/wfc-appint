import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { type AdditionalButtonsProps } from "./data-table"

interface DataTableLoadingProps {
  hideSearch?: boolean
  additionalButtons?: AdditionalButtonsProps[]
  columnsLength: number
}

export function DataTableLoading({ hideSearch, additionalButtons, columnsLength }: DataTableLoadingProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideSearch && <Skeleton className="h-10 w-1/3" />}
        {!!additionalButtons?.length && <Skeleton className="h-10 w-32" />}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columnsLength }).map((_, index) => (
                <TableHead key={`loading-header-${index}`} className="h-12">
                  <Skeleton className="h-6 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <TableRow key={`loading-row-${rowIndex}`}>
                {Array.from({ length: columnsLength }).map((_, colIndex) => (
                  <TableCell key={`loading-body-${rowIndex}-${colIndex}`} className="h-16">
                    <Skeleton className="h-2 w-full rounded-none" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
