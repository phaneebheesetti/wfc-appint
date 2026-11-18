import { Pagination } from "@/components/ui/pagination"
import { PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"
import { useDataTablePaginationQueryState } from "@/hooks"
import { type Pagination as PaginationType } from "@/types/pagination"

interface DataTableControlledPaginationProps {
  pagination: PaginationType
}

export function DataTableControlledPagination({ pagination }: DataTableControlledPaginationProps) {
  const { setQueryPagination } = useDataTablePaginationQueryState()

  const {
    page = PAGINATION_PAGE_DEFAULT,
    limit = PAGINATION_LIMIT_DEFAULT,
    total = 0,
    totalPages = 0,
    hasNextPage = false,
    hasPreviousPage = false,
  } = pagination ?? {}

  const handleFirstPage = async () => {
    void setQueryPagination(paginationParams => ({ ...paginationParams, page: 1 }))
  }

  const handlePreviousPage = () => {
    void setQueryPagination(paginationParams => ({ ...paginationParams, page: paginationParams.page - 1 }))
  }

  const handleNextPage = () => {
    void setQueryPagination(paginationParams => ({ ...paginationParams, page: paginationParams.page + 1 }))
  }

  const handleLastPage = () => {
    void setQueryPagination(paginationParams => ({ ...paginationParams, page: totalPages }))
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
