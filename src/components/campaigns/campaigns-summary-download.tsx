"use client"

import JSZip from "jszip"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatPrizeReportForExport } from "@/utils/prizes"
import { toUrlSlug } from "@/utils/url"

interface CampaignsSummaryDownloadProps {
  campaign: Campaign
}

export function CampaignsSummaryDownload({ campaign }: CampaignsSummaryDownloadProps) {
  const [shouldDownloadSummary, setShouldDownloadSummary] = useState(false)
  const campaignId = campaign.id
  const utils = api.useUtils()

  const { data: summary } = api.campaigns.getSummary.useQuery(
    {
      campaignId,
    },
    {
      enabled: shouldDownloadSummary,
    }
  )

  const { mutateAsync: downloadParticipants } = api.campaignsUsers.downloadReportByCampaignId.useMutation()
  const { mutateAsync: downloadPaymentLogs } = api.paymentLogs.downloadReportByCampaignId.useMutation()
  const { mutateAsync: downloadCasesTransactions } = api.casesTransactions.downloadReportByCampaignId.useMutation()
  const { mutateAsync: downloadPrizes } = api.prizes.downloadReportByCampaignId.useMutation()
  const { mutateAsync: downloadPermissionSlips } = api.documentsUsers.downloadReportByCampaignId.useMutation()

  const downloadSummary = async () => {
    if (shouldDownloadSummary) {
      return
    }
    setShouldDownloadSummary(true)
  }

  const downloadCsvZip = async (summary: { campaignCsvUrl: string | null }) => {
    const zip = new JSZip()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const addSheet = (name: string, sheetName: string, rows: Record<string, string | number>[]) => {
      if (rows.length > 0) {
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName)
        zip.file(name, XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer)
      }
    }

    const [participants, paymentLogs, casesTransactions, prizes, permissionSlips] = await Promise.all([
      downloadParticipants({ campaignId }),
      downloadPaymentLogs({ campaignId, timezone }),
      downloadCasesTransactions({ campaignId, timezone }),
      downloadPrizes({ campaignId }),
      downloadPermissionSlips({ campaignId, timezone }),
    ])

    addSheet("fundraiser-participants.xlsx", "Participants Report", participants)
    addSheet("fundraiser-payment-logs.xlsx", "Transactions Report", paymentLogs)
    addSheet("fundraiser-cases-transactions.xlsx", "Cases Transactions Report", casesTransactions)
    addSheet(
      "fundraiser-prizes.xlsx",
      "Prizes Report",
      formatPrizeReportForExport({ data: prizes }) as unknown as Record<string, string | number>[]
    )
    addSheet("fundraiser-permission-slips.xlsx", "Permission Slips Report", permissionSlips)

    if (summary.campaignCsvUrl) {
      const response = await fetch(summary.campaignCsvUrl)
      zip.file("fundraiser-summary.csv", await response.blob())
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })

    const fileName = `fundraiser-summary-${toUrlSlug(campaign.name)}.zip`

    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    void utils.campaigns.getSummary.invalidate()
  }

  useEffect(() => {
    if (shouldDownloadSummary && summary) {
      setShouldDownloadSummary(false)
      void downloadCsvZip(summary)
    }
  }, [summary, shouldDownloadSummary])

  return (
    <Button variant="secondary" onClick={() => downloadSummary()}>
      <Download />
      Download Summary
    </Button>
  )
}
