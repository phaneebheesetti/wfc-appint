import { getPrizeTemplateName } from "@/constants/prize-templates"
import type { db } from "@/server/db"
import { formatDate } from "@/utils/date"
import { formatCentsToCurrency } from "@/utils/money"
import { firstLetterUpperCase } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

import { campaignsGetById } from "./campaigns-get-by-id"
import { campaignsGetMetrics } from "./campaigns-get-metrics"

export interface CampaignDownloadReportData {
  Organization: string
  Location: string
  Fundraiser: string
  Sponsor: string
  Status: string
  "Start Date": string
  "End Date": string
  "Digital Payments Enabled": boolean
  "Digital Permission Slips Enabled": boolean
  "Home Run Prizes Template Enabled": boolean
  "Home Run Prize Template": string
  "Total Cases Checked Out": number | string
  "Total Cases Delivered": number | string
  "Total Paid ($)": string
  "Total Owed ($)": string
  "Active Users": number | string
  "Total Users": number | string
  "Signed Permission Slips": number | string
  "Total Permission Slips": number | string
  "Digital Payments ($)": string
  "Digital Payments (%)": string
  "Last Login/Activity": string
}

export const campaignsDownloadReportById = async ({
  database,
  input,
}: {
  database: typeof db
  input: { campaignId: string }
}): Promise<CampaignDownloadReportData[]> => {
  const [campaign, metrics] = await Promise.all([
    campaignsGetById({ database, input: { id: input.campaignId } }),
    campaignsGetMetrics({ database, input: { campaignId: input.campaignId } }),
  ])

  if (!campaign) {
    return [
      {
        Organization: "",
        Location: "",
        Fundraiser: "",
        Sponsor: "",
        Status: "",
        "Start Date": "",
        "End Date": "",
        "Digital Payments Enabled": false,
        "Digital Permission Slips Enabled": false,
        "Home Run Prizes Template Enabled": false,
        "Home Run Prize Template": "",
        "Total Cases Checked Out": "",
        "Total Cases Delivered": "",
        "Total Paid ($)": "",
        "Total Owed ($)": "",
        "Active Users": "",
        "Total Users": "",
        "Signed Permission Slips": "",
        "Total Permission Slips": "",
        "Digital Payments ($)": "",
        "Digital Payments (%)": "",
        "Last Login/Activity": "",
      },
    ]
  }

  const location = [campaign.organization?.street, campaign.organization?.city, campaign.organization?.state]
    .filter(Boolean)
    .join(", ")

  return [
    {
      Organization: campaign.organization?.name ?? "",
      Location: location,
      Fundraiser: campaign.name,
      Sponsor: getUserDisplayName(campaign.sponsor),
      Status: firstLetterUpperCase(campaign.status ?? ""),
      "Start Date": formatDate(campaign.startDate),
      "End Date": formatDate(campaign.endDate),
      "Digital Payments Enabled": campaign.digitalPayment,
      "Digital Permission Slips Enabled": campaign.digitalPermissionSlip,
      "Home Run Prizes Template Enabled": campaign.homeRunPrizesTemplate,
      "Home Run Prize Template": getPrizeTemplateName(campaign.prizeTemplateSlug) ?? "",
      "Total Cases Checked Out": metrics.totalCasesCheckedOut,
      "Total Cases Delivered": metrics.totalCasesDelivered,
      "Total Paid ($)": formatCentsToCurrency(metrics.totalPaidCents),
      "Total Owed ($)": formatCentsToCurrency(metrics.totalOwedCents),
      "Active Users": metrics.activeUsers,
      "Total Users": metrics.totalUsers,
      "Signed Permission Slips": metrics.signedPermissionSlips,
      "Total Permission Slips": metrics.totalPermissionSlips,
      "Digital Payments ($)": formatCentsToCurrency(metrics.digitalPaymentsAmountCents),
      "Digital Payments (%)": `${metrics.digitalPaymentsPercentage.toFixed(2)}%`,
      "Last Login/Activity": formatDate(new Date()),
    },
  ]
}
