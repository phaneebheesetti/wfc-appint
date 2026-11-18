import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"
import { type Pagination } from "@/types/pagination"

interface PaginationProps extends Pagination {
  handleFirstPage: () => void
  handlePreviousPage: () => void
  handleNextPage: () => void
  handleLastPage: () => void
}

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  handleFirstPage,
  handlePreviousPage,
  handleNextPage,
  handleLastPage,
}: PaginationProps) {
  const showStart = total > 0 ? page * limit - limit + 1 : 0
  const showEnd = Math.min(showStart + limit - 1, total)

  if (total === 0) return null

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing {showStart}-{showEnd} rows of {total} total
      </div>

      <div className="flex items-center gap-0 md:gap-4 w-full md:w-auto justify-between">
        <div className="flex items-center justify-center text-sm font-medium">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <WithTooltip
            content="Go to first page"
            side="top"
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0 lg:flex"
                onClick={handleFirstPage}
                disabled={!hasPreviousPage || page === 1}
              >
                <ChevronsLeft />
              </Button>
            }
          />

          <WithTooltip
            content="Go to previous page"
            side="top"
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handlePreviousPage}
                disabled={!hasPreviousPage || page === 1}
              >
                <ChevronLeft />
              </Button>
            }
          />

          <WithTooltip
            content="Go to next page"
            side="top"
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={handleNextPage}
                disabled={!hasNextPage || page === totalPages}
              >
                <ChevronRight />
              </Button>
            }
          />

          <WithTooltip
            content="Go to last page"
            side="top"
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 p-0 lg:flex"
                onClick={handleLastPage}
                disabled={!hasNextPage || page === totalPages}
              >
                <ChevronsRight />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  )
}
