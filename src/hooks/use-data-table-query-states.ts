import { createParser, parseAsArrayOf, parseAsString, parseAsStringEnum, useQueryState, useQueryStates } from "nuqs"

import { OrderByDirectionEnum } from "@/constants/database"

interface UseDataTableQueryStatesProps {
  id?: string
  defaultOrderBy?: string
  defaultOrderDirection?: OrderByDirectionEnum
}

type FilterValue = (string | boolean)[]

export const parseAsStringOrBoolean = createParser<string | boolean>({
  parse: value => {
    if (value === "true") return true
    if (value === "false") return false
    return value
  },
  serialize: value => String(value),
})

const ARRAY_DELIMITER = "|"

const parseTuple = createParser<[string, FilterValue]>({
  parse: (value: string) => {
    const [key, rawValue] = value.split(":") as [string, string]
    const values = rawValue.split(ARRAY_DELIMITER).map(v => parseAsStringOrBoolean.parse(v) ?? v)

    return [key, values]
  },
  serialize: (value: [string, FilterValue]) => `${value[0]}:${value[1].map(v => String(v)).join(ARRAY_DELIMITER)}`,
})

const parseFiltersAsObject = createParser<Record<string, FilterValue>>({
  parse: (query: string) => {
    const array = parseAsArrayOf(parseTuple).parse(query)
    return array ? Object.fromEntries(array) : {}
  },
  serialize: (obj: Record<string, FilterValue>) => {
    const entries = Object.entries(obj)
    return parseAsArrayOf(parseTuple).serialize(entries)
  },
})

export const useDataTableQueryStates = ({
  id = "",
  defaultOrderBy = "",
  defaultOrderDirection = OrderByDirectionEnum.ASC,
}: UseDataTableQueryStatesProps) => {
  const [querySearch, setQuerySearch] = useQueryState(`${id}search`, parseAsString.withDefault(""))

  const [queryFilters, setQueryFilters] = useQueryState("filters", parseFiltersAsObject)

  const [querySort, setQuerySort] = useQueryStates({
    orderBy: parseAsString.withDefault(defaultOrderBy),
    orderDirection: parseAsStringEnum<OrderByDirectionEnum>(Object.values(OrderByDirectionEnum)).withDefault(
      defaultOrderDirection
    ),
  })

  const resetQuerySearch = () => {
    void setQuerySearch(null)
  }

  const resetQueryFilters = () => {
    void setQueryFilters(null)
  }

  const resetQuerySort = () => {
    void setQuerySort({ orderBy: null, orderDirection: null })
  }

  const canResetAllQueryStates = Boolean(querySearch) || Boolean(queryFilters) || Boolean(querySort.orderBy)

  const resetAllQueryStates = () => {
    resetQuerySearch()
    resetQueryFilters()
    resetQuerySort()
  }

  return {
    querySearch,
    setQuerySearch,
    resetQuerySearch,

    queryFilters,
    setQueryFilters,
    resetQueryFilters,

    querySort,
    setQuerySort,
    resetQuerySort,

    canResetAllQueryStates,
    resetAllQueryStates,
  }
}
