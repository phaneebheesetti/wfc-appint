import { parseAsInteger, useQueryStates } from "nuqs"

import { PAGINATION_LIMIT_DEFAULT, PAGINATION_PAGE_DEFAULT } from "@/constants/database"

interface UseDataTablePaginationQueryStateProps {
  page?: number
  limit?: number
}

export const useDataTablePaginationQueryState = ({ page, limit }: UseDataTablePaginationQueryStateProps = {}) => {
  const [queryPagination, setQueryPagination] = useQueryStates({
    page: parseAsInteger.withDefault(page ?? PAGINATION_PAGE_DEFAULT),
    limit: parseAsInteger.withDefault(limit ?? PAGINATION_LIMIT_DEFAULT),
  })

  return { queryPagination, setQueryPagination }
}
