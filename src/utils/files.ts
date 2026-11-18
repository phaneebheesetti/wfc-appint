import { download, generateCsv, mkConfig } from "export-to-csv"
import * as XLSX from "xlsx"

import { toUrlSlug } from "@/utils/url"

export enum FileReportType {
  CSV = "csv",
  EXCEL = "excel",
}

interface DownloadFileReportProps {
  type: FileReportType
  fileName: string
  data: Record<string, string | number>[]
  sheetName?: string
  includeDate?: boolean
}

export const downloadFileReport = async ({
  type,
  fileName,
  data = [],
  sheetName = "Report",
  includeDate = true,
}: DownloadFileReportProps) => {
  const slug = toUrlSlug(fileName)
  const finalFileName = includeDate ? `${slug}-${new Date().toISOString().split("T")[0]}` : slug

  if (type === FileReportType.EXCEL) {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    XLSX.writeFile(workbook, `${finalFileName}.xlsx`)
  } else {
    const csvConfig = mkConfig({ useKeysAsHeaders: true, filename: finalFileName })

    const csv = generateCsv(csvConfig)(data)

    download(csvConfig)(csv)
  }
}
