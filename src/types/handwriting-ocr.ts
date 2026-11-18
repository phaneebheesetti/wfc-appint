export interface HandwritingOCRUploadResponse {
  id: string
  status: string
}

export interface HandwritingOCRDownloadResponse {
  id: string
  file_name: string
  action: string
  page_count: number
  status: string
  results: PageResult[]
  thumbnails: Thumbnail[]
  automatically_deleted_at: string
  created_at: string
  updated_at: string
}

interface PageResult {
  page_number: number
  tables: Table[]
  key_value_pairs: KeyValuePair[]
}

export interface Table {
  rows: Row[]
  rowCount: number
  columnCount: number
  tableNumber: number
  hasHeaderRow: boolean
  headerContent: string | null
}

interface Row {
  type: "row" | "header"
  cells: Cell[]
  rowIndex: number
}

interface Cell {
  content: string
  rowIndex: number
  columnIndex: number
  kind?: "columnHeader"
}

interface KeyValuePair {
  key: string
  value: string
}

interface Thumbnail {
  page_number: number
  url: string
}
