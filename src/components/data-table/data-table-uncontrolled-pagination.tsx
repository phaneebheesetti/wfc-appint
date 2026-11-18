import type { Table } from "@tanstack/react-table"

import { Pagination } from "@/components/ui/pagination"

interface DataTableUncontrolledPaginationProps<TData> {
  table: Table<TData>
}

export function DataTableUncontrolledPagination<TData>({ table }: DataTableUncontrolledPaginationProps<TData>) {
  const page = table.getState().pagination.pageIndex + 1
  const limit = table.getState().pagination.pageSize
  const total = table.getRowCount()
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  const handleFirstPage = async () => {
    table.setPageIndex(0)
  }

  const handlePreviousPage = () => {
    table.previousPage()
  }

  const handleNextPage = () => {
    table.nextPage()
  }

  const handleLastPage = () => {
    table.setPageIndex(table.getPageCount() - 1)
  }

  return (
    <Pagination
      page={page}
      limit={limit}
      total={total}
      totalPages={totalPages}
      hasPreviousPage={hasPreviousPage}
      hasNextPage={hasNextPage}
      handleFirstPage={handleFirstPage}
      handlePreviousPage={handlePreviousPage}
      handleNextPage={handleNextPage}
      handleLastPage={handleLastPage}
    />
  )
}
