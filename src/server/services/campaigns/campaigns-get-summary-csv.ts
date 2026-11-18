import { generateCsv, mkConfig } from "export-to-csv"

import type { db } from "@/server/db"

import { campaignsGetById } from "./campaigns-get-by-id"
import { campaignsGetHeaderMetrics } from "./campaigns-get-header-metrics"

export const campaignsGetSummaryCsv = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}) => {
  const campaign = await campaignsGetById({
    database,
    input: { id: input.campaignId },
  })

  const headerMetrics = await campaignsGetHeaderMetrics({
    database,
    input: { campaignId: input.campaignId },
  })

  const casesRemaining = headerMetrics.totalCasesDelivered - headerMetrics.totalCasesCheckedOut
  const averageCasesPerParticipant = headerMetrics.totalCasesDelivered / headerMetrics.totalParticipants
  const paymentCollected = headerMetrics.totalPaymentCollected
  const paymentDue = headerMetrics.totalPaymentOwed
  const dateRange = `${campaign?.startDate?.toLocaleDateString()} - ${campaign?.endDate?.toLocaleDateString()}`

  return generateCsv(
    mkConfig({
      filename: `campaign-summary`,
      useKeysAsHeaders: true,
    })
  )([
    {
      "Campaign Name": campaign?.name ?? "",
      Organization: campaign?.organization.name ?? "",
      Location: `${campaign?.organization.street}, ${campaign?.organization.city}, ${campaign?.organization.postalCode}`,
      "Date Range": dateRange,
      Status: campaign?.status ?? "",
      "Total Participants": headerMetrics.totalParticipants,
      "Payments Collected": paymentCollected,
      "Payments Due": paymentDue,
      "Total Cases Delivered": headerMetrics.totalCasesDelivered,
      "Total Cases Checked Out": headerMetrics.totalCasesCheckedOut,
      "Total Cases Remaining": casesRemaining,
      "Average Cases per Participant": averageCasesPerParticipant,
    },
  ])
}
